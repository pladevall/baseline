import sqlite3
import os
import json
import requests
from datetime import datetime
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Load environment variables
load_dotenv('.env.local')

GEMINI_API_KEY = os.getenv('GOOGLE_GEMINI_API_KEY')
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_ANON_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
BEAR_DB_PATH = os.path.expanduser('~/Library/Group Containers/9K33E3U3T4.net.shinyfrog.bear/Application Data/database.sqlite')

if not GEMINI_API_KEY:
    print("Error: GOOGLE_GEMINI_API_KEY not found in .env.local")
    exit(1)

client = genai.Client(api_key=GEMINI_API_KEY)

def get_bear_note(title):
    try:
        conn = sqlite3.connect(BEAR_DB_PATH)
        cursor = conn.cursor()
        query = "SELECT ZTEXT FROM ZSFNOTE WHERE ZTITLE = ? AND ZTRASHED = 0 AND ZARCHIVED = 0 LIMIT 1;"
        cursor.execute(query, (title,))
        result = cursor.fetchone()
        conn.close()
        return result[0] if result else None
    except Exception as e:
        print(f"Error connecting to Bear DB: {e}")
        return None

def parse_with_gemini(text):
    truncated_text = text # Send full text, context window is large enough
    prompt = f"""
    The note is structured with Year headers (e.g. "2026", "2025").
    
    INSTRUCTIONS:
    1. Find the "2026" header.
    2. Extract events STRICTLY from the bullet points under the "2026" header.
    3. STOP processing immediately when you see the "2025" header (or any other year).
    4. Do NOT extract events from the 2025 section.
    
    For each event found under 2026, provide:
    - title: A short, concise title focusing on the accomplishment (e.g., "Ran 5k" instead of "I went for a run today"). Max 5-6 words.
    - start_date: ISO date (YYYY-MM-DD). The year is 2026.
    - end_date: ISO date (YYYY-MM-DD). Same as start_date if it's a single day.
    - category: One of [deep_work, shallow_work, meeting, life, other].
    
    Return the result ONLY as a JSON array of objects. If no events are found under 2026, return [].
    
    Text to parse (last part of note):
    \"\"\"{truncated_text}\"\"\"
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type='application/json'
            )
        )
        print(f"DEBUG: Raw response: {response.text}")
        return json.loads(response.text)
    except Exception as e:
        print(f"Error parsing Gemini response: {e}")
        return []

def get_existing_events(supabase_url, headers):
    # Fetch ALL events (pending, accepted, rejected) to prevent duplicates
    try:
        response = requests.get(
            f"{supabase_url}/rest/v1/inbox_events?select=title,start_date",
            headers=headers
        )
        if response.status_code == 200:
            return {f"{e['title']}|{e['start_date']}" for e in response.json()}
        return set()
    except:
        return set()

def sync_to_supabase(events):
    if not events: return

    SUPABASE_KEY = SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: Supabase credentials not found.")
        return

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

    existing_set = get_existing_events(SUPABASE_URL, headers)
    
    inbox_events = []
    for event in events:
        key = f"{event['title']}|{event['start_date']}"
        if key not in existing_set:
            inbox_events.append({
                "title": event['title'],
                "start_date": event['start_date'],
                "end_date": event['end_date'],
                "category": event['category'],
                "status": "pending",
                "external_id": f"bear_{datetime.now().timestamp()}_{event['title'][:10]}"
            })
    
    if not inbox_events:
        print("No new events to sync (all duplicates/ignored).")
        return

    response = requests.post(f"{SUPABASE_URL}/rest/v1/inbox_events", headers=headers, json=inbox_events)

    if response.status_code in [200, 201]:
        print(f"Successfully synced {len(inbox_events)} events.")
    else:
        print(f"Error: {response.status_code} - {response.text}")

def main():
    print(f"DEBUG: Looking for note in {BEAR_DB_PATH}")
    note_content = get_bear_note("Daily Log")
    if not note_content:
        print("DEBUG: Note 'Daily Log' not found in Bear.")
        return
    
    print(f"DEBUG: Found note (length: {len(note_content)}). Sending to Gemini...")
    events = parse_with_gemini(note_content)
    print(f"DEBUG: Gemini returned {len(events)} potential events.")
    
    if events:
        sync_to_supabase(events)
    else:
        print("DEBUG: No events were extracted from the note.")

if __name__ == "__main__":
    main()

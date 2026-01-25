'use server';

import { createClient } from '@/lib/supabase/server';
import { InboxEvent } from '@/types/calendar';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { addDays, format, startOfYear, endOfYear } from 'date-fns';
import { fetchGoogleEvents, mapGoogleTitleToCategory } from '@/lib/google-calendar';
import { GoogleGenerativeAI } from '@google/generative-ai';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import os from 'os';

const BEAR_DB_PATH = path.join(os.homedir(), 'Library/Group Containers/9K33E3U3T4.net.shinyfrog.bear/Application Data/database.sqlite');


export async function getInboxEvents(): Promise<InboxEvent[]> {
    const supabase = await createClient();

    // 1. Fetch pending inbox events from DB
    const { data: dbInboxEvents, error } = await supabase
        .from('inbox_events')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching inbox events:', error);
        return [];
    }

    // 2. Trigger a background sync (or inline for simplicity and immediate results)
    try {
        await syncGoogleCalendarEvents();
    } catch (err) {
        console.error('Failed to sync google calendar events:', err);
    }

    // 3. Re-fetch to get any newly added events
    const { data: updatedEvents } = await supabase
        .from('inbox_events')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    return (updatedEvents || []) as InboxEvent[];
}

async function syncGoogleCalendarEvents(accessToken?: string) {
    const logs: string[] = [];
    const log = (msg: string) => { console.log(msg); logs.push(msg); };

    log('[Inbox] Starting sync...');

    // 1. Try to get Authenticated User (Standard Flow)
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser(accessToken);

    let targetUserId: string | null | undefined = authUser?.id;
    let clientToUse: any = supabase;

    // 2. Fallback: If no auth user, try to infer user from existing data (Local/Dev Mode)
    // Or default to NULL if table allows it (requires migration 013)
    if (!targetUserId) {
        log('[Inbox] No auth user found. Checking for existing user ID...');

        // Use standard client for lookup (assuming public access allowed)
        const { data: existingEvent } = await supabase
            .from('calendar_events')
            .select('user_id')
            .not('user_id', 'is', null) // Filter out nulls
            .limit(1)
            .single();

        if (existingEvent?.user_id) {
            targetUserId = existingEvent.user_id;
            log(`[Inbox] Inferred User ID from database: ${targetUserId}`);
        } else {
            log('[Inbox] No existing user found. Proceeding with anonymous/null user.');
            targetUserId = null; // Will work if migration 013 is applied
        }
    } else {
        log(`[Inbox] Authenticated User found: ${targetUserId}`);
    }

    // Fetch full year (Jan 1 to Dec 31)
    const now = new Date(); // Use current year
    const start = startOfYear(now);
    const end = endOfYear(now);

    log(`[Inbox] Fetching Google events from ${start.toISOString()} to ${end.toISOString()}`);
    const googleEvents = await fetchGoogleEvents(start, end);
    log(`[Inbox] Fetched ${googleEvents.length} events from Google`);

    if (!googleEvents.length) return logs;

    // Get existing external IDs from calendar_events and inbox_events to avoid duplicates

    // Check main calendar logic...
    const { data: existingCalendarEvents } = await clientToUse
        .from('calendar_events')
        .select('*')
        .gte('end_date', format(now, 'yyyy-MM-dd'));

    // Check inbox (pending/rejected)
    // Note: We need to check rejected ones too, to avoid surface them again if user rejected them.
    const { data: existingInboxEvents } = await clientToUse
        .from('inbox_events')
        .select('external_id')
        .in('status', ['pending', 'rejected']);

    const existingInboxIds = new Set(existingInboxEvents?.map((e: any) => e.external_id) || []);
    log(`[Inbox] Found ${existingInboxIds.size} existing inbox items`);

    const newEvents = [];

    for (const gEvent of googleEvents) {
        if (!gEvent.id || existingInboxIds.has(gEvent.id)) continue;

        // Also check if it looks like it's already in calendar_events (accepted)
        const startDate = gEvent.start?.date || gEvent.start?.dateTime?.split('T')[0];
        const endDate = gEvent.end?.date || gEvent.end?.dateTime?.split('T')[0];
        const title = gEvent.summary;

        if (!startDate || !endDate || !title) continue;

        const isAlreadyInCalendar = existingCalendarEvents?.some((ce: any) =>
            ce.start_date === startDate && ce.title === title
        );

        if (isAlreadyInCalendar) continue;

        newEvents.push({
            user_id: targetUserId, // Use the resolved ID or null
            external_id: gEvent.id,
            title: title,
            start_date: startDate,
            end_date: endDate,
            category: mapGoogleTitleToCategory(title),
            status: 'pending'
        });
    }

    log(`[Inbox] Prepared ${newEvents.length} new events to insert`);

    if (newEvents.length > 0) {
        const { error } = await clientToUse.from('inbox_events').insert(newEvents);
        if (error) {
            log(`[Inbox] Error inserting events: ${error.message}`);
        } else {
            log('[Inbox] Successfully inserted new events');
        }
    }

    return logs;
}

export async function acceptInboxEvent(event: InboxEvent) {
    const supabase = await createClient();

    // 1. Insert into calendar_events
    const { error: insertError } = await supabase
        .from('calendar_events')
        .insert({
            user_id: event.user_id,
            title: event.title,
            start_date: event.start_date,
            end_date: event.end_date,
            category: event.category,
        });

    if (insertError) {
        throw new Error(`Failed to accept event: ${insertError.message}`);
    }

    // 2. Mark as processed. 
    // If we delete it, next sync might bring it back unless sync logic handles it.
    // Sync logic uses existingCalendarEvents check (by title/date). 
    // So if title/date matches, it won't re-sync.
    // Thus we CAN delete it.

    const { error: deleteError } = await supabase
        .from('inbox_events')
        .delete()
        .eq('id', event.id);

    if (deleteError) {
        console.error('Error cleaning up inbox event:', deleteError);
    }

    revalidatePath('/calendar');
}

export async function rejectInboxEvent(id: string) {
    const supabase = await createClient();

    // SOFT DELETE: Update status to 'rejected' so we don't re-sync it
    const { error } = await supabase
        .from('inbox_events')
        .update({ status: 'rejected' })
        .eq('id', id);

    if (error) {
        throw new Error(`Failed to reject event: ${error.message}`);
    }

    revalidatePath('/calendar');
}

async function syncBearNotes() {
    const logs: string[] = [];
    const log = (msg: string) => { console.log(msg); logs.push(msg); };

    log('[Bear] Starting sync...');

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
        log('[Bear] ERROR: GOOGLE_GEMINI_API_KEY not found');
        return logs;
    }

    // 1. Fetch 'Daily Log' from Bear SQLite
    let noteText = '';
    try {
        const db = new sqlite3.Database(BEAR_DB_PATH);
        const get = promisify(db.get.bind(db));
        const row = await get("SELECT ZTEXT FROM ZSFNOTE WHERE ZTITLE = 'Daily Log' AND ZTRASHED = 0 AND ZARCHIVED = 0 LIMIT 1") as { ZTEXT: string } | undefined;
        db.close();

        if (!row?.ZTEXT) {
            log('[Bear] Note "Daily Log" not found');
            return logs;
        }
        noteText = row.ZTEXT;
    } catch (err: any) {
        log(`[Bear] DB Error: ${err.message}`);
        return logs;
    }

    log(`[Bear] Fetched note (len: ${noteText.length}). Parsing with Gemini...`);

    // 2. Parse with Gemini
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Send full text, context window is large enough
        const truncated = noteText;

        const prompt = `
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
            
            Return the result ONLY as a JSON array of objects. 
            If no events are found under 2026, return exactly [].
            
            Text to parse (last part of note):
            """${truncated}"""
        `;

        const result = await model.generateContent(prompt);
        const response = result.response;
        let text = response.text().trim();

        // Clean markdown JSON if present
        if (text.startsWith('```json')) text = text.replace('```json', '').replace('```', '').trim();
        else if (text.startsWith('```')) text = text.replace('```', '').replace('```', '').trim();

        const events = JSON.parse(text);
        log(`[Bear] Gemini found ${events.length} events`);

        if (events.length > 0) {
            const supabase = await createClient();

            // Get existing events to avoid duplicates
            const { data: existing } = await supabase
                .from('inbox_events')
                .select('title, start_date')
                .eq('status', 'pending');

            const existingSet = new Set(existing?.map(e => `${e.title}|${e.start_date}`) || []);

            const newEvents = events
                .filter((e: any) => !existingSet.has(`${e.title}|${e.start_date}`))
                .map((e: any) => ({
                    title: e.title,
                    start_date: e.start_date,
                    end_date: e.end_date,
                    category: e.category,
                    status: 'pending',
                    external_id: `bear_${Date.now()}_${e.title.slice(0, 10)}`
                }));

            if (newEvents.length > 0) {
                const { error } = await supabase.from('inbox_events').insert(newEvents);
                if (error) log(`[Bear] INSERT Error: ${error.message}`);
                else log(`[Bear] Successfully inserted ${newEvents.length} events`);
            } else {
                log('[Bear] No new events to add (all duplicates)');
            }
        }
    } catch (err: any) {
        log(`[Bear] Gemini/Parse Error: ${err.message}`);
    }

    return logs;
}

export async function seedInboxEvents(accessToken?: string) {
    // Run both syncs in parallel
    const [googleLogs, bearLogs] = await Promise.all([
        syncGoogleCalendarEvents(accessToken),
        syncBearNotes()
    ]);

    revalidatePath('/calendar');
    return [...googleLogs, ...bearLogs];
}

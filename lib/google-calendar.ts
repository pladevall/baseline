import { google } from 'googleapis';
import { CalendarCategoryKey } from '@/types/calendar';

// Credentials from environment variables
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN!;

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    console.warn('Google Calendar credentials missing from environment variables');
}

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    'http://localhost'
);

oauth2Client.setCredentials({
    refresh_token: REFRESH_TOKEN
});

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

export async function fetchGoogleEvents(timeMin: Date, timeMax: Date) {
    try {
        let allEvents: any[] = [];
        let pageToken: string | undefined = undefined;

        do {
            const response: any = await calendar.events.list({
                calendarId: 'primary',
                timeMin: timeMin.toISOString(),
                timeMax: timeMax.toISOString(),
                singleEvents: true,
                orderBy: 'startTime',
                pageToken: pageToken,
            });

            const items = response.data.items || [];
            allEvents = [...allEvents, ...items];
            pageToken = response.data.nextPageToken;

        } while (pageToken);

        return allEvents;
    } catch (error) {
        console.error('Error fetching Google Calendar events:', error);
        return [];
    }
}

export function mapGoogleTitleToCategory(title: string): CalendarCategoryKey {
    const lower = title.toLowerCase();

    if (lower.includes('gym') || lower.includes('workout') || lower.includes('run') || lower.includes('lift') || lower.includes('yoga') || lower.includes('swim')) {
        return 'fitness';
    }

    if (lower.includes('code') || lower.includes('dev') || lower.includes('programming') || lower.includes('ship') || lower.includes('build') || lower.includes('debug')) {
        return 'ship';
    }

    if (lower.includes('learn') || lower.includes('study') || lower.includes('read') || lower.includes('course') || lower.includes('class')) {
        return 'learn';
    }

    if (lower.includes('deep work') || lower.includes('focus')) {
        return 'deep_work';
    }

    if (lower.includes('lunch') || lower.includes('dinner') || lower.includes('family') || lower.includes('party') || lower.includes('visit') || lower.includes('doctor') || lower.includes('dentist')) {
        return 'life';
    }

    return 'other';
}

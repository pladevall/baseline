
import { fetchGoogleEvents } from '../lib/google-calendar';
import { startOfYear, endOfYear } from 'date-fns';

async function main() {
    console.log('--- Starting Google Calendar Debug ---');

    const now = new Date();
    const start = startOfYear(now);
    const end = endOfYear(now);

    console.log(`Fetching events from ${start.toISOString()} to ${end.toISOString()}`);

    try {
        const events = await fetchGoogleEvents(start, end);
        console.log(`Successfully fetched ${events.length} events.`);

        if (events.length > 0) {
            console.log('First 5 events:');
            events.slice(0, 5).forEach((e: any) => {
                console.log(`- [${e.start?.dateTime || e.start?.date}] ${e.summary} (ID: ${e.id})`);
            });
        } else {
            console.log('No events found. Check if the calendar "primary" is correct or if token is valid.');
        }
    } catch (error) {
        console.error('Fatal error calling fetchGoogleEvents:', error);
    }
}

main();

import { createClient } from '@/lib/supabase/server';
import { CalendarPageClient } from '@/components/calendar/calendar-page-client';
import { DesktopGuard } from '@/components/calendar/desktop-guard';

export default async function CalendarPage() {
    // Server-side fetch without Auth check (Public Access)
    const supabase = await createClient();

    // Fetch all events for public display
    const { data: events } = await supabase
        .from('calendar_events')
        .select('*')
        .order('start_date', { ascending: true });

    return (
        <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 transition-colors">
            <DesktopGuard>
                <CalendarPageClient initialEvents={events || []} />
            </DesktopGuard>
        </div>
    );
}

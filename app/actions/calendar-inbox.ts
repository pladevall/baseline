'use server';

import { createClient } from '@/lib/supabase/server';
import { InboxEvent } from '@/types/calendar';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { addDays, format, startOfYear, endOfYear } from 'date-fns';
import { fetchGoogleEvents, mapGoogleTitleToCategory } from '@/lib/google-calendar';

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

export async function seedInboxEvents(accessToken?: string) {
    // Re-mapped to sync logic for convenience
    const logs = await syncGoogleCalendarEvents(accessToken);
    revalidatePath('/calendar');
    return logs;
}

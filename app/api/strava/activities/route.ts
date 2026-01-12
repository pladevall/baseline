/**
 * Strava Activities API
 * GET - Retrieve stored running activities
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRunningActivities } from '@/lib/supabase-strava';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const connectionId = searchParams.get('connectionId') || undefined;

        const activities = await getRunningActivities(connectionId);

        return NextResponse.json({ activities });
    } catch (error) {
        console.error('Error fetching running activities:', error);
        return NextResponse.json(
            { error: 'Failed to fetch activities' },
            { status: 500 }
        );
    }
}

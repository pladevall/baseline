/**
 * Hevy Workouts API
 * GET - Retrieve stored lifting workouts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLiftingWorkouts } from '@/lib/supabase-hevy';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const connectionId = searchParams.get('connectionId') || undefined;

        const workouts = await getLiftingWorkouts(connectionId);

        return NextResponse.json({ workouts });
    } catch (error) {
        console.error('Error fetching lifting workouts:', error);
        return NextResponse.json(
            { error: 'Failed to fetch workouts' },
            { status: 500 }
        );
    }
}

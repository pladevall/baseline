/**
 * Hevy Sync API
 * POST - Fetch new workouts from Hevy and save to database
 */

import { NextRequest, NextResponse } from 'next/server';
import { HevyClient, convertHevyWorkout } from '@/lib/hevy-client';
import {
    getHevyConnection,
    updateHevySyncStatus,
    saveLiftingWorkouts,
    getLastWorkoutDate,
} from '@/lib/supabase-hevy';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { connectionId } = body;

        if (!connectionId) {
            return NextResponse.json(
                { error: 'Connection ID is required' },
                { status: 400 }
            );
        }

        // Get the connection
        const connection = await getHevyConnection(connectionId);
        if (!connection) {
            return NextResponse.json(
                { error: 'Connection not found' },
                { status: 404 }
            );
        }

        // Update status to pending
        await updateHevySyncStatus(connectionId, 'pending');

        try {
            // Create Hevy client
            const client = new HevyClient(connection.apiKey);

            // Get the last workout date to fetch only new workouts
            const lastWorkoutDate = await getLastWorkoutDate(connectionId);

            // Fetch workouts since last sync (or all if first sync)
            // Subtract a day to account for timezone issues
            const since = lastWorkoutDate
                ? new Date(lastWorkoutDate.getTime() - 24 * 60 * 60 * 1000)
                : undefined;

            const hevyWorkouts = await client.getAllWorkouts(since);

            // Convert workouts
            const convertedWorkouts = await Promise.all(
                hevyWorkouts.map(w => convertHevyWorkout(w, client))
            );

            // Save to database
            const savedWorkouts = await saveLiftingWorkouts(connectionId, convertedWorkouts);

            // Update sync status
            await updateHevySyncStatus(connectionId, 'connected');

            return NextResponse.json({
                success: true,
                workoutsCount: savedWorkouts.length,
                message: `Synced ${savedWorkouts.length} lifting workouts`,
            });
        } catch (syncError) {
            console.error('Error during Hevy sync:', syncError);
            await updateHevySyncStatus(connectionId, 'error');
            throw syncError;
        }
    } catch (error) {
        console.error('Error syncing Hevy workouts:', error);
        return NextResponse.json(
            { error: 'Failed to sync workouts' },
            { status: 500 }
        );
    }
}

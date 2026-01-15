import { NextRequest, NextResponse } from 'next/server';
import { StravaClient, convertStravaActivity } from '@/lib/strava-client';
import { HevyClient, convertHevyWorkout } from '@/lib/hevy-client';
import {
    getStravaConnections,
    updateStravaTokens,
    updateStravaSyncStatus,
    saveRunningActivities,
    getLastActivityDate,
} from '@/lib/supabase-strava';
import {
    getHevyConnections,
    updateHevySyncStatus,
    saveLiftingWorkouts,
    getLastWorkoutDate,
} from '@/lib/supabase-hevy';

export const maxDuration = 300; // Allow 5 minutes for sync

export async function GET(request: NextRequest) {
    // Basic authorization check for Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = {
        strava: { total: 0, synced: 0, errors: 0 },
        hevy: { total: 0, synced: 0, errors: 0 },
    };

    try {
        // ========================================
        // STRAVA SYNC
        // ========================================
        const stravaConnections = await getStravaConnections();
        console.log(`[Cron] Found ${stravaConnections.length} Strava connections`);

        for (const connection of stravaConnections) {
            try {
                // Update status to pending
                await updateStravaSyncStatus(connection.id, 'pending');

                // Create client
                const client = new StravaClient(
                    connection.accessToken,
                    connection.refreshToken,
                    new Date(connection.tokenExpiresAt).getTime() / 1000,
                    async (tokens) => {
                        await updateStravaTokens(connection.id, tokens);
                    }
                );

                // Get last activity date
                const lastActivityDate = await getLastActivityDate(connection.id);
                
                // Fetch activities since last sync (minus 1 day buffer)
                const since = lastActivityDate
                    ? new Date(lastActivityDate.getTime() - 24 * 60 * 60 * 1000)
                    : undefined;

                console.log(`[Cron] Syncing Strava for ${connection.athleteId} since ${since?.toISOString() ?? 'beginning'}`);

                const stravaActivities = await client.getAllRunningActivities(since);

                // Fetch details
                const detailedActivities = [];
                for (const activity of stravaActivities) {
                    try {
                        const detailed = await client.getActivity(activity.id);
                        detailedActivities.push(detailed);
                    } catch (err) {
                        console.warn(`[Cron] Failed to fetch details for Strava activity ${activity.id}`, err);
                        detailedActivities.push(activity);
                    }
                    // Rate limit protection
                    if (stravaActivities.length > 10) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                }

                // Convert and save
                if (detailedActivities.length > 0) {
                    const convertedActivities = detailedActivities.map(convertStravaActivity);
                    await saveRunningActivities(connection.id, convertedActivities);
                    results.strava.synced += convertedActivities.length;
                }

                await updateStravaSyncStatus(connection.id, 'connected');
            } catch (err) {
                console.error(`[Cron] Error syncing Strava connection ${connection.id}:`, err);
                await updateStravaSyncStatus(connection.id, 'error');
                results.strava.errors++;
            }
            results.strava.total++;
        }

        // ========================================
        // HEVY SYNC
        // ========================================
        const hevyConnections = await getHevyConnections();
        console.log(`[Cron] Found ${hevyConnections.length} Hevy connections`);

        for (const connection of hevyConnections) {
            try {
                await updateHevySyncStatus(connection.id, 'pending');

                const client = new HevyClient(connection.apiKey);

                // Get last workout date
                const lastWorkoutDate = await getLastWorkoutDate(connection.id);
                
                // Fetch since last workout (minus 1 day buffer)
                const since = lastWorkoutDate
                    ? new Date(lastWorkoutDate.getTime() - 24 * 60 * 60 * 1000)
                    : undefined;
                
                console.log(`[Cron] Syncing Hevy for ${connection.id} since ${since?.toISOString() ?? 'beginning'}`);

                // Pre-fetch templates for better performance
                await client.getExerciseTemplates();

                // Fetch workouts
                const hevyWorkouts = await client.getAllWorkouts(since);

                if (hevyWorkouts.length > 0) {
                    // Convert
                    const convertedWorkouts = await Promise.all(
                        hevyWorkouts.map(w => convertHevyWorkout(w, client))
                    );

                    // Save
                    await saveLiftingWorkouts(connection.id, convertedWorkouts);
                    results.hevy.synced += convertedWorkouts.length;
                }

                await updateHevySyncStatus(connection.id, 'connected');
            } catch (err) {
                console.error(`[Cron] Error syncing Hevy connection ${connection.id}:`, err);
                await updateHevySyncStatus(connection.id, 'error');
                results.hevy.errors++;
            }
            results.hevy.total++;
        }

        return NextResponse.json({
            success: true,
            results,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[Cron] Global sync error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}

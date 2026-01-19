'use client';

import useSWR, { mutate } from 'swr';
import { BIAEntry, BodyspecScan, RunningActivity, LiftingWorkout, SleepEntry } from './types';
import { getEntriesFromDb, getGoals, Goal } from './supabase';

interface BaselineData {
    entries: BIAEntry[];
    bodyspecScans: BodyspecScan[];
    bodyspecConnections: any[];
    goals: Goal[];
    stravaConnections: any[];
    hevyConnections: any[];
    runningActivities: RunningActivity[];
    liftingWorkouts: LiftingWorkout[];
    sleepEntries: SleepEntry[];
}

// Fetcher that loads all baseline data in parallel
async function fetchBaselineData(): Promise<BaselineData> {
    const [
        entries,
        goals,
        bodyspecConnRes,
        bodyspecScansRes,
        stravaConnRes,
        stravaActivitiesRes,
        hevyConnRes,
        hevyWorkoutsRes,
        sleepRes,
    ] = await Promise.all([
        getEntriesFromDb(),
        getGoals(),
        fetch('/api/bodyspec/connections').then(r => r.ok ? r.json() : { connections: [] }),
        fetch('/api/bodyspec/scans').then(r => r.ok ? r.json() : { scans: [] }),
        fetch('/api/strava/connections').then(r => r.ok ? r.json() : { connections: [] }),
        fetch('/api/strava/activities').then(r => r.ok ? r.json() : { activities: [] }),
        fetch('/api/hevy/connections').then(r => r.ok ? r.json() : { connections: [] }),
        fetch('/api/hevy/workouts').then(r => r.ok ? r.json() : { workouts: [] }),
        fetch('/api/sleep').then(r => r.ok ? r.json() : { entries: [] }),
    ]);

    return {
        entries,
        goals,
        bodyspecConnections: bodyspecConnRes.connections || [],
        bodyspecScans: bodyspecScansRes.scans || [],
        stravaConnections: stravaConnRes.connections || [],
        runningActivities: stravaActivitiesRes.activities || [],
        hevyConnections: hevyConnRes.connections || [],
        liftingWorkouts: hevyWorkoutsRes.workouts || [],
        sleepEntries: sleepRes.entries || [],
    };
}

// SWR cache key
const BASELINE_CACHE_KEY = 'baseline-data';

export function useBaselineData() {
    const { data, error, isLoading, isValidating } = useSWR<BaselineData>(
        BASELINE_CACHE_KEY,
        fetchBaselineData,
        {
            revalidateOnFocus: false, // Don't refetch when tab gains focus
            revalidateOnReconnect: false, // Don't refetch on reconnect
            dedupingInterval: 60000, // Dedupe requests within 60s
            keepPreviousData: true, // Keep showing old data while revalidating
        }
    );

    // Refresh function to manually trigger revalidation
    const refresh = () => mutate(BASELINE_CACHE_KEY);

    return {
        data: data ?? {
            entries: [],
            bodyspecScans: [],
            bodyspecConnections: [],
            goals: [],
            stravaConnections: [],
            hevyConnections: [],
            runningActivities: [],
            liftingWorkouts: [],
            sleepEntries: [],
        },
        isLoading,
        isValidating,
        error,
        refresh,
    };
}

// Also export mutate for external updates
export { mutate as mutateBaselineData };

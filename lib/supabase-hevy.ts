/**
 * Supabase Database Functions for Hevy Integration
 * Handles all database operations for Hevy connections and lifting workouts
 */

import { supabase } from './supabase';
import { HevyConnection, LiftingWorkout, BodyPartStats, LiftingExercise, LiftingExerciseDetailed } from './types';

// Simple encryption/decryption for API keys
function encryptToken(token: string): string {
    if (typeof window === 'undefined') {
        return Buffer.from(token).toString('base64');
    }
    return btoa(token);
}

function decryptToken(encryptedToken: string): string {
    if (typeof window === 'undefined') {
        return Buffer.from(encryptedToken, 'base64').toString('utf-8');
    }
    return atob(encryptedToken);
}

// ========================================
// Connection Management
// ========================================

/**
 * Save a new Hevy connection with API key
 */
export async function saveHevyConnection(params: {
    apiKey: string;
    connectionName: string;
}): Promise<HevyConnection> {
    const encryptedApiKey = encryptToken(params.apiKey);

    const { data, error } = await supabase
        .from('hevy_connections')
        .insert({
            api_key: encryptedApiKey,
            connection_name: params.connectionName,
            sync_status: 'connected',
        })
        .select()
        .single();

    if (error) {
        console.error('Error saving Hevy connection:', error);
        throw new Error(`Failed to save connection: ${error.message}`);
    }

    return mapRowToConnection(data);
}

/**
 * Get all Hevy connections
 */
export async function getHevyConnections(): Promise<HevyConnection[]> {
    const { data, error } = await supabase
        .from('hevy_connections')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching Hevy connections:', error);
        return [];
    }

    return (data || []).map(mapRowToConnection);
}

/**
 * Get a specific connection by ID
 */
export async function getHevyConnection(connectionId: string): Promise<HevyConnection | null> {
    const { data, error } = await supabase
        .from('hevy_connections')
        .select('*')
        .eq('id', connectionId)
        .single();

    if (error) {
        console.error('Error fetching Hevy connection:', error);
        return null;
    }

    return data ? mapRowToConnection(data) : null;
}

/**
 * Update sync status for a connection
 */
export async function updateHevySyncStatus(
    connectionId: string,
    status: 'connected' | 'error' | 'pending',
    lastSync?: string
): Promise<void> {
    const updates: Record<string, unknown> = {
        sync_status: status,
    };

    if (lastSync) {
        updates.last_sync = lastSync;
    } else if (status === 'connected') {
        updates.last_sync = new Date().toISOString();
    }

    const { error } = await supabase
        .from('hevy_connections')
        .update(updates)
        .eq('id', connectionId);

    if (error) {
        console.error('Error updating sync status:', error);
        throw new Error(`Failed to update sync status: ${error.message}`);
    }
}

/**
 * Delete a Hevy connection and all associated workouts
 */
export async function deleteHevyConnection(connectionId: string): Promise<void> {
    const { error } = await supabase
        .from('hevy_connections')
        .delete()
        .eq('id', connectionId);

    if (error) {
        console.error('Error deleting Hevy connection:', error);
        throw new Error(`Failed to delete connection: ${error.message}`);
    }
}

// ========================================
// Workout Management
// ========================================

/**
 * Save or update lifting workouts
 */
export async function saveLiftingWorkouts(
    connectionId: string,
    workouts: Array<{
        hevyId: string;
        workoutDate: string;
        name: string;
        totalSets: number;
        durationSeconds: number;
        totalReps: number;
        totalVolumeLbs: number;
        bodyParts: Record<string, { sets: number; reps: number; volumeLbs: number }>;
        exercises: Array<{
            name: string;
            bodyPart: string;
            sets: number;
            reps: number;
            weightLbs: number | null;
        }>;
        exercisesDetailed: Array<{
            name: string;
            bodyPart: string;
            sets: Array<{
                index: number;
                type: 'normal' | 'warmup' | 'dropset' | 'failure';
                weightLbs: number | null;
                reps: number | null;
                rpe: number | null;
            }>;
        }>;
    }>
): Promise<LiftingWorkout[]> {
    if (workouts.length === 0) {
        return [];
    }

    const rows = workouts.map(w => ({
        connection_id: connectionId,
        hevy_id: w.hevyId,
        workout_date: w.workoutDate,
        name: w.name,
        total_sets: w.totalSets,
        duration_seconds: w.durationSeconds,
        total_reps: w.totalReps,
        total_volume_lbs: w.totalVolumeLbs,
        body_parts: w.bodyParts,
        exercises: w.exercises,
        exercises_detailed: w.exercisesDetailed,
    }));

    const { data, error } = await supabase
        .from('lifting_workouts')
        .upsert(rows, {
            onConflict: 'connection_id,hevy_id',
        })
        .select();

    if (error) {
        console.error('Error saving lifting workouts:', error);
        throw new Error(`Failed to save workouts: ${error.message}`);
    }

    return (data || []).map(mapRowToWorkout);
}

/**
 * Get all lifting workouts, optionally filtered by connection
 */
export async function getLiftingWorkouts(connectionId?: string): Promise<LiftingWorkout[]> {
    let query = supabase.from('lifting_workouts').select('*');

    if (connectionId) {
        query = query.eq('connection_id', connectionId);
    }

    const { data, error } = await query.order('workout_date', { ascending: false });

    if (error) {
        console.error('Error fetching lifting workouts:', error);
        return [];
    }

    return (data || []).map(mapRowToWorkout);
}

/**
 * Get the most recent workout date for a connection
 */
export async function getLastWorkoutDate(connectionId: string): Promise<Date | null> {
    const { data, error } = await supabase
        .from('lifting_workouts')
        .select('workout_date')
        .eq('connection_id', connectionId)
        .order('workout_date', { ascending: false })
        .limit(1)
        .single();

    if (error || !data) {
        return null;
    }

    return new Date(data.workout_date);
}

/**
 * Get workouts within a date range
 */
export async function getWorkoutsInDateRange(
    startDate: string,
    endDate: string,
    connectionId?: string
): Promise<LiftingWorkout[]> {
    let query = supabase
        .from('lifting_workouts')
        .select('*')
        .gte('workout_date', startDate)
        .lte('workout_date', endDate);

    if (connectionId) {
        query = query.eq('connection_id', connectionId);
    }

    const { data, error } = await query.order('workout_date', { ascending: false });

    if (error) {
        console.error('Error fetching workouts in date range:', error);
        return [];
    }

    return (data || []).map(mapRowToWorkout);
}

// ========================================
// Helper Functions
// ========================================

function mapRowToConnection(row: Record<string, unknown>): HevyConnection {
    return {
        id: row.id as string,
        userId: row.user_id as string | undefined,
        apiKey: decryptToken(row.api_key as string),
        connectionName: row.connection_name as string,
        lastSync: row.last_sync as string | null,
        syncStatus: row.sync_status as 'connected' | 'error' | 'pending',
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
    };
}

function mapRowToWorkout(row: Record<string, unknown>): LiftingWorkout {
    return {
        id: row.id as string,
        connectionId: row.connection_id as string,
        hevyId: row.hevy_id as string,
        workoutDate: row.workout_date as string,
        name: row.name as string | null,
        totalSets: row.total_sets as number,
        durationSeconds: row.duration_seconds as number,
        totalReps: row.total_reps as number,
        totalVolumeLbs: row.total_volume_lbs as number | null,
        bodyParts: row.body_parts as Record<string, BodyPartStats> | null,
        exercises: row.exercises as LiftingExercise[] | null,
        exercisesDetailed: row.exercises_detailed as LiftingExerciseDetailed[] | null,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
    };
}

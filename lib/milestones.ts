import { LiftingWorkout, RunningActivity, LiftingExerciseDetailed } from './types';

// ========================================
// Types
// ========================================

export interface LiftingMilestone {
    value: number;
    date: string;
    workoutId: string;
    exerciseName: string;
    // Additional context depending on milestone type
    reps?: number;
    oneRepMax?: number;
    totalVolume?: number;
}

export interface ExerciseMilestones {
    heaviestWeight?: LiftingMilestone;
    bestSetVolume?: LiftingMilestone;
    best1RM?: LiftingMilestone;
    mostRepsAtWeight?: LiftingMilestone; // Not implemented for now to keep it simple, or maybe we can?
    bestSessionVolume?: LiftingMilestone;
}

export interface RunningMilestone {
    rank: 1 | 2 | 3;
    timeSeconds: number;
    date: string;
    activityId: string;
    distanceKey: string;
}

export const RUNNING_DISTANCES = [
    { key: '1mi', label: '1 Mile', miles: 1 },
    { key: '2mi', label: '2 Miles', miles: 2 },
    { key: '5k', label: '5K', miles: 3.10686 },
    { key: '5mi', label: '5 Miles', miles: 5 },
    { key: '10k', label: '10K', miles: 6.21371 },
    { key: '10mi', label: '10 Miles', miles: 10 },
    { key: 'half', label: 'Half Marathon', miles: 13.1094 },
    { key: 'marathon', label: 'Marathon', miles: 26.2188 },
] as const;

// ========================================
// Helpers
// ========================================

/**
 * Epley Formula for 1RM
 * 1RM = Weight * (1 + Reps / 30)
 */
export function calculate1RM(weightLbs: number, reps: number): number {
    if (reps === 1) return weightLbs;
    return weightLbs * (1 + reps / 30);
}

/**
 * Format relative time (e.g. "3 months ago")
 */
export function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 7) {
        return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
    }

    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 4) {
        return diffWeeks === 1 ? '1 week ago' : `${diffWeeks} weeks ago`;
    }

    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) {
        return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
    }

    const diffYears = Math.floor(diffDays / 365);
    return diffYears === 1 ? '1 year ago' : `${diffYears} years ago`;
}

// ========================================
// Lifting Calculations
// ========================================

export function calculateLiftingMilestones(workouts: LiftingWorkout[]): Map<string, ExerciseMilestones> {
    const milestones = new Map<string, ExerciseMilestones>();

    // Process workouts from oldest to newest to establish timeline? 
    // No, we just want the absolute bests. Order doesn't matter for finding max.

    for (const workout of workouts) {
        if (!workout.exercisesDetailed) continue;

        for (const exercise of workout.exercisesDetailed) {
            const name = exercise.name;

            let currentRecords = milestones.get(name) || {};
            let updated = false;

            // Calculate Session Volume
            let sessionVolume = 0;

            for (const set of exercise.sets) {
                // Skip warmup sets for records
                if (set.type === 'warmup') continue;

                const weight = set.weightLbs || 0;
                const reps = set.reps || 0;

                if (weight > 0 && reps > 0) {
                    const volume = weight * reps;
                    sessionVolume += volume;

                    const oneRM = calculate1RM(weight, reps);

                    // 1. Heaviest Weight
                    if (!currentRecords.heaviestWeight || weight > currentRecords.heaviestWeight.value) {
                        currentRecords.heaviestWeight = {
                            value: weight,
                            date: workout.workoutDate,
                            workoutId: workout.id,
                            exerciseName: name,
                            reps
                        };
                        updated = true;
                    }

                    // 2. Best Set Volume
                    if (!currentRecords.bestSetVolume || volume > currentRecords.bestSetVolume.value) {
                        currentRecords.bestSetVolume = {
                            value: volume,
                            date: workout.workoutDate,
                            workoutId: workout.id,
                            exerciseName: name,
                            reps,
                            // Storing weight in 'value' is weird for volume? No value is volume.
                        };
                        updated = true;
                    }

                    // 3. Best 1RM
                    if (!currentRecords.best1RM || oneRM > currentRecords.best1RM.value) {
                        currentRecords.best1RM = {
                            value: oneRM,
                            date: workout.workoutDate,
                            workoutId: workout.id,
                            exerciseName: name,
                            reps,
                            // Store actual weight lifted too?
                        };
                        updated = true;
                    }
                }
            }

            // 4. Best Session Volume
            if (sessionVolume > 0) {
                if (!currentRecords.bestSessionVolume || sessionVolume > currentRecords.bestSessionVolume.value) {
                    currentRecords.bestSessionVolume = {
                        value: sessionVolume,
                        date: workout.workoutDate,
                        workoutId: workout.id,
                        exerciseName: name
                    };
                    updated = true;
                }
            }

            if (updated) {
                milestones.set(name, currentRecords);
            }
        }
    }

    return milestones;
}

// ========================================
// Running Calculations
// ========================================

export function calculateRunningMilestones(activities: RunningActivity[]): Map<string, RunningMilestone[]> {
    const milestones = new Map<string, RunningMilestone[]>();

    // Helper to find time at specific distance for an activity
    // This logic must match the splits logic in WorkoutTable or reuse it
    // Since we don't have direct access to "getTimeAtMile" from here without importing or duplicating
    // We'll duplicate the logic for now as it's small.

    const getBestTimeForDistance = (activity: RunningActivity, targetMiles: number): number | null => {
        if (activity.distanceMiles < targetMiles) return null;
        if (!activity.splits) return null;

        // Use splits to interpolate/find time
        // If target is exact mile (1, 2, ...), simple look up
        // If target is fraction (5k = 3.1), we need to approximate or use average pace if we don't have granular data.
        // The current data structure has "splits" as per-mile splits.

        // Simple approach matching typical runners logic:
        // If run is 5 miles, we have splits for mile 1, 2, 3, 4, 5.
        // 1 mi time = valid
        // 2 mi time = split 1 + split 2
        // 5k (3.1m) = split 1 + split 2 + split 3 + fraction of split 4?

        // For now let's stick to what WorkoutTable likely does or can do.
        // Actually, strictly speaking, Strava API often gives "best efforts" separately.
        // But here we only have the total activity and per-mile splits.
        // So we can assume: Time = (Distance / Total Distance) * Total Time? No, that's average.
        // We can assume: Sum of first N splits >= distance.

        // Let's implement a "Splits Sum" approach for integer miles.
        // For fractional (5k, 10k, Half), we will estimate based on the mile it falls in.

        let time = 0;
        let distanceCovered = 0;

        // Sort splits by mile just in case
        const sortedSplits = [...activity.splits].sort((a, b) => a.mile - b.mile);

        for (const split of sortedSplits) {
            if (distanceCovered + 1 <= targetMiles) {
                time += split.timeSeconds;
                distanceCovered += 1;
            } else {
                // Need partial mile
                const remaining = targetMiles - distanceCovered;
                if (remaining > 0) {
                    // Assume constant pace for this split
                    time += split.timeSeconds * remaining;
                    distanceCovered += remaining;
                }
                break;
            }
        }

        if (distanceCovered < targetMiles) return null; // Logic check
        return time;
    };

    const allPerformances: Record<string, Array<{ time: number, date: string, id: string }>> = {};

    // Initialize arrays
    RUNNING_DISTANCES.forEach(d => {
        allPerformances[d.key] = [];
    });

    for (const activity of activities) {
        RUNNING_DISTANCES.forEach(dist => {
            const time = getBestTimeForDistance(activity, dist.miles);
            if (time) {
                allPerformances[dist.key].push({
                    time,
                    date: activity.activityDate,
                    id: activity.id
                });
            }
        });
    }

    // Sort and take top 3 for each distance
    Object.keys(allPerformances).forEach(key => {
        const performances = allPerformances[key];
        performances.sort((a, b) => a.time - b.time);

        const top3 = performances.slice(0, 3).map((p, index) => ({
            rank: (index + 1) as 1 | 2 | 3,
            timeSeconds: p.time,
            date: p.date,
            activityId: p.id,
            distanceKey: key
        }));

        if (top3.length > 0) {
            milestones.set(key, top3);
        }
    });

    return milestones;
}

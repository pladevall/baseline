'use client';

import { useState, useMemo } from 'react';
import { RunningActivity, LiftingWorkout, WorkoutType, VolumePeriod, BODY_PARTS, RUNNING_MILESTONES } from '@/lib/types';

interface WorkoutTableProps {
    runningActivities: RunningActivity[];
    liftingWorkouts: LiftingWorkout[];
}

// Format seconds as mm:ss or h:mm:ss
function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Format pace (seconds per mile) as m:ss
function formatPace(secondsPerMile: number): string {
    const minutes = Math.floor(secondsPerMile / 60);
    const secs = Math.round(secondsPerMile % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Get date string in YYYY-MM-DD format
function toDateKey(dateString: string): string {
    return new Date(dateString).toISOString().split('T')[0];
}

// Format date for column header
function formatDateHeader(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Get cumulative time at a specific mile distance
function getTimeAtMile(splits: { mile: number; cumulativeSeconds: number }[] | null, targetMiles: number): number | null {
    if (!splits || splits.length === 0) return null;

    // Find the split closest to the target distance
    const targetSplit = splits.find(s => Math.abs(s.mile - targetMiles) < 0.2);
    if (targetSplit) {
        return targetSplit.cumulativeSeconds;
    }

    // For fractional distances (like 5K = 3.1 miles), interpolate
    const lastCompleteMile = Math.floor(targetMiles);
    const fraction = targetMiles - lastCompleteMile;

    const baseSplit = splits.find(s => s.mile === lastCompleteMile);
    const nextSplit = splits.find(s => s.mile === lastCompleteMile + 1);

    if (baseSplit && nextSplit) {
        const timeForFraction = (nextSplit.cumulativeSeconds - baseSplit.cumulativeSeconds) * fraction;
        return baseSplit.cumulativeSeconds + timeForFraction;
    }

    if (baseSplit && fraction === 0) {
        return baseSplit.cumulativeSeconds;
    }

    return null;
}

export default function WorkoutTable({ runningActivities, liftingWorkouts }: WorkoutTableProps) {
    const [workoutType, setWorkoutType] = useState<WorkoutType>('all');
    const [volumePeriod, setVolumePeriod] = useState<VolumePeriod>('7');

    // Get unique dates from all workouts, sorted newest first
    const allDates = useMemo(() => {
        const dateSet = new Set<string>();

        if (workoutType !== 'lifting') {
            runningActivities.forEach(a => dateSet.add(toDateKey(a.activityDate)));
        }
        if (workoutType !== 'run') {
            liftingWorkouts.forEach(w => dateSet.add(toDateKey(w.workoutDate)));
        }

        return Array.from(dateSet).sort((a, b) => b.localeCompare(a));
    }, [runningActivities, liftingWorkouts, workoutType]);

    // Index workouts by date
    const runningByDate = useMemo(() => {
        const map = new Map<string, RunningActivity>();
        runningActivities.forEach(a => map.set(toDateKey(a.activityDate), a));
        return map;
    }, [runningActivities]);

    const liftingByDate = useMemo(() => {
        const map = new Map<string, LiftingWorkout>();
        liftingWorkouts.forEach(w => map.set(toDateKey(w.workoutDate), w));
        return map;
    }, [liftingWorkouts]);

    // Calculate volume period range
    const volumeStartDate = useMemo(() => {
        const now = new Date();
        switch (volumePeriod) {
            case '7':
                return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            case '30':
                return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            case '90':
                return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            case 'YTD':
                return new Date(now.getFullYear(), 0, 1);
            case 'PY':
                return new Date(now.getFullYear() - 1, 0, 1);
            default:
                return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }
    }, [volumePeriod]);

    const volumeEndDate = useMemo(() => {
        if (volumePeriod === 'PY') {
            return new Date(new Date().getFullYear() - 1, 11, 31);
        }
        return new Date();
    }, [volumePeriod]);

    // Calculate volume totals
    const liftingVolume = useMemo(() => {
        const workoutsInRange = liftingWorkouts.filter(w => {
            const date = new Date(w.workoutDate);
            return date >= volumeStartDate && date <= volumeEndDate;
        });

        let totalSets = 0;
        let totalDuration = 0;
        let totalReps = 0;
        const bodyPartTotals: Record<string, number> = {};

        workoutsInRange.forEach(w => {
            totalSets += w.totalSets;
            totalDuration += w.durationSeconds;
            totalReps += w.totalReps;

            if (w.bodyParts) {
                Object.entries(w.bodyParts).forEach(([part, stats]) => {
                    bodyPartTotals[part] = (bodyPartTotals[part] || 0) + stats.sets;
                });
            }
        });

        return { totalSets, totalDuration, totalReps, bodyPartTotals };
    }, [liftingWorkouts, volumeStartDate, volumeEndDate]);

    const runningVolume = useMemo(() => {
        const activitiesInRange = runningActivities.filter(a => {
            const date = new Date(a.activityDate);
            return date >= volumeStartDate && date <= volumeEndDate;
        });

        let totalMiles = 0;
        let totalDuration = 0;

        activitiesInRange.forEach(a => {
            totalMiles += a.distanceMiles;
            totalDuration += a.durationSeconds;
        });

        return { totalMiles, totalDuration };
    }, [runningActivities, volumeStartDate, volumeEndDate]);

    // Get body parts that have data
    const activeBodyParts = useMemo(() => {
        const parts = new Set<string>();
        liftingWorkouts.forEach(w => {
            if (w.bodyParts) {
                Object.keys(w.bodyParts).forEach(p => parts.add(p));
            }
        });
        // Sort by BODY_PARTS order
        return BODY_PARTS.filter(p => parts.has(p));
    }, [liftingWorkouts]);

    // Get running milestones that have data
    const activeMilestones = useMemo(() => {
        return RUNNING_MILESTONES.filter(m => {
            return runningActivities.some(a => a.distanceMiles >= m.miles * 0.95);
        });
    }, [runningActivities]);

    // Limit to recent dates for display
    const displayDates = allDates.slice(0, 10);

    if (runningActivities.length === 0 && liftingWorkouts.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No workout data yet. Connect Strava or Hevy to sync your workouts.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex flex-wrap items-center gap-4">
                {/* Workout type toggle */}
                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-md p-1">
                    {(['run', 'lifting', 'all'] as WorkoutType[]).map(type => (
                        <button
                            key={type}
                            onClick={() => setWorkoutType(type)}
                            className={`px-3 py-1 text-sm font-medium rounded transition-colors ${workoutType === type
                                    ? 'bg-white dark:bg-gray-700 shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                        >
                            {type === 'run' ? '🏃 Run' : type === 'lifting' ? '🏋️ Lift' : 'All'}
                        </button>
                    ))}
                </div>

                {/* Volume period toggle */}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Volume:</span>
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-md p-1">
                        {(['7', '30', '90', 'YTD', 'PY'] as VolumePeriod[]).map(period => (
                            <button
                                key={period}
                                onClick={() => setVolumePeriod(period)}
                                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${volumePeriod === period
                                        ? 'bg-white dark:bg-gray-700 shadow-sm'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                    }`}
                            >
                                {period === 'YTD' || period === 'PY' ? period : `${period}d`}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="sticky left-0 bg-white dark:bg-gray-900 px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                                Metric
                            </th>
                            {displayDates.map(date => (
                                <th key={date} className="px-3 py-2 text-center font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                    {formatDateHeader(date)}
                                </th>
                            ))}
                            <th className="px-3 py-2 text-center font-medium text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20">
                                Vol ({volumePeriod === 'YTD' || volumePeriod === 'PY' ? volumePeriod : `${volumePeriod}d`})
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Lifting Section */}
                        {workoutType !== 'run' && liftingWorkouts.length > 0 && (
                            <>
                                <tr className="bg-purple-50 dark:bg-purple-900/20">
                                    <td colSpan={displayDates.length + 2} className="px-3 py-1 font-semibold text-purple-700 dark:text-purple-300">
                                        🏋️ Lifting
                                    </td>
                                </tr>
                                {/* Sets */}
                                <tr className="border-b border-gray-100 dark:border-gray-800">
                                    <td className="sticky left-0 bg-white dark:bg-gray-900 px-3 py-1.5 text-gray-600 dark:text-gray-400">Sets</td>
                                    {displayDates.map(date => {
                                        const workout = liftingByDate.get(date);
                                        return (
                                            <td key={date} className="px-3 py-1.5 text-center">
                                                {workout ? workout.totalSets : '—'}
                                            </td>
                                        );
                                    })}
                                    <td className="px-3 py-1.5 text-center font-medium bg-blue-50 dark:bg-blue-900/20">
                                        {liftingVolume.totalSets}
                                    </td>
                                </tr>
                                {/* Duration */}
                                <tr className="border-b border-gray-100 dark:border-gray-800">
                                    <td className="sticky left-0 bg-white dark:bg-gray-900 px-3 py-1.5 text-gray-600 dark:text-gray-400">Duration</td>
                                    {displayDates.map(date => {
                                        const workout = liftingByDate.get(date);
                                        return (
                                            <td key={date} className="px-3 py-1.5 text-center">
                                                {workout ? formatDuration(workout.durationSeconds) : '—'}
                                            </td>
                                        );
                                    })}
                                    <td className="px-3 py-1.5 text-center font-medium bg-blue-50 dark:bg-blue-900/20">
                                        {formatDuration(liftingVolume.totalDuration)}
                                    </td>
                                </tr>
                                {/* Reps */}
                                <tr className="border-b border-gray-100 dark:border-gray-800">
                                    <td className="sticky left-0 bg-white dark:bg-gray-900 px-3 py-1.5 text-gray-600 dark:text-gray-400">Reps</td>
                                    {displayDates.map(date => {
                                        const workout = liftingByDate.get(date);
                                        return (
                                            <td key={date} className="px-3 py-1.5 text-center">
                                                {workout ? workout.totalReps.toLocaleString() : '—'}
                                            </td>
                                        );
                                    })}
                                    <td className="px-3 py-1.5 text-center font-medium bg-blue-50 dark:bg-blue-900/20">
                                        {liftingVolume.totalReps.toLocaleString()}
                                    </td>
                                </tr>
                                {/* Body parts */}
                                {activeBodyParts.map(part => (
                                    <tr key={part} className="border-b border-gray-100 dark:border-gray-800">
                                        <td className="sticky left-0 bg-white dark:bg-gray-900 px-3 py-1.5 text-gray-600 dark:text-gray-400 capitalize">
                                            {part}
                                        </td>
                                        {displayDates.map(date => {
                                            const workout = liftingByDate.get(date);
                                            const sets = workout?.bodyParts?.[part]?.sets;
                                            return (
                                                <td key={date} className="px-3 py-1.5 text-center">
                                                    {sets ? sets : '—'}
                                                </td>
                                            );
                                        })}
                                        <td className="px-3 py-1.5 text-center font-medium bg-blue-50 dark:bg-blue-900/20">
                                            {liftingVolume.bodyPartTotals[part] || '—'}
                                        </td>
                                    </tr>
                                ))}
                            </>
                        )}

                        {/* Running Section */}
                        {workoutType !== 'lifting' && runningActivities.length > 0 && (
                            <>
                                <tr className="bg-orange-50 dark:bg-orange-900/20">
                                    <td colSpan={displayDates.length + 2} className="px-3 py-1 font-semibold text-orange-700 dark:text-orange-300">
                                        🏃 Running
                                    </td>
                                </tr>
                                {/* Miles */}
                                <tr className="border-b border-gray-100 dark:border-gray-800">
                                    <td className="sticky left-0 bg-white dark:bg-gray-900 px-3 py-1.5 text-gray-600 dark:text-gray-400">Miles</td>
                                    {displayDates.map(date => {
                                        const activity = runningByDate.get(date);
                                        return (
                                            <td key={date} className="px-3 py-1.5 text-center">
                                                {activity ? activity.distanceMiles.toFixed(1) : '—'}
                                            </td>
                                        );
                                    })}
                                    <td className="px-3 py-1.5 text-center font-medium bg-blue-50 dark:bg-blue-900/20">
                                        {runningVolume.totalMiles.toFixed(1)}
                                    </td>
                                </tr>
                                {/* Duration */}
                                <tr className="border-b border-gray-100 dark:border-gray-800">
                                    <td className="sticky left-0 bg-white dark:bg-gray-900 px-3 py-1.5 text-gray-600 dark:text-gray-400">Duration</td>
                                    {displayDates.map(date => {
                                        const activity = runningByDate.get(date);
                                        return (
                                            <td key={date} className="px-3 py-1.5 text-center">
                                                {activity ? formatDuration(activity.durationSeconds) : '—'}
                                            </td>
                                        );
                                    })}
                                    <td className="px-3 py-1.5 text-center font-medium bg-blue-50 dark:bg-blue-900/20">
                                        {formatDuration(runningVolume.totalDuration)}
                                    </td>
                                </tr>
                                {/* Pace */}
                                <tr className="border-b border-gray-100 dark:border-gray-800">
                                    <td className="sticky left-0 bg-white dark:bg-gray-900 px-3 py-1.5 text-gray-600 dark:text-gray-400">Avg Pace</td>
                                    {displayDates.map(date => {
                                        const activity = runningByDate.get(date);
                                        return (
                                            <td key={date} className="px-3 py-1.5 text-center">
                                                {activity?.averagePaceSeconds ? `${formatPace(activity.averagePaceSeconds)}/mi` : '—'}
                                            </td>
                                        );
                                    })}
                                    <td className="px-3 py-1.5 text-center bg-blue-50 dark:bg-blue-900/20">
                                        —
                                    </td>
                                </tr>
                                {/* Split times at milestones */}
                                {activeMilestones.map(milestone => (
                                    <tr key={milestone.key} className="border-b border-gray-100 dark:border-gray-800">
                                        <td className="sticky left-0 bg-white dark:bg-gray-900 px-3 py-1.5 text-gray-600 dark:text-gray-400">
                                            {milestone.label}
                                        </td>
                                        {displayDates.map(date => {
                                            const activity = runningByDate.get(date);
                                            if (!activity || activity.distanceMiles < milestone.miles * 0.95) {
                                                return <td key={date} className="px-3 py-1.5 text-center">—</td>;
                                            }
                                            const time = getTimeAtMile(activity.splits, milestone.miles);
                                            return (
                                                <td key={date} className="px-3 py-1.5 text-center">
                                                    {time ? formatDuration(Math.round(time)) : '—'}
                                                </td>
                                            );
                                        })}
                                        <td className="px-3 py-1.5 text-center bg-blue-50 dark:bg-blue-900/20">
                                            —
                                        </td>
                                    </tr>
                                ))}
                            </>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

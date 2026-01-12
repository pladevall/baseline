'use client';

import { useState } from 'react';

interface WorkoutSyncButtonProps {
    stravaConnectionId?: string;
    hevyConnectionId?: string;
    onSyncComplete?: () => void;
}

export default function WorkoutSyncButton({
    stravaConnectionId,
    hevyConnectionId,
    onSyncComplete,
}: WorkoutSyncButtonProps) {
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncMessage, setLastSyncMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSync = async () => {
        if (!stravaConnectionId && !hevyConnectionId) {
            setError('No connections to sync');
            return;
        }

        setIsSyncing(true);
        setError(null);
        setLastSyncMessage(null);

        const results: string[] = [];

        try {
            // Sync Strava
            if (stravaConnectionId) {
                try {
                    const response = await fetch('/api/strava/sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ connectionId: stravaConnectionId }),
                    });

                    if (response.ok) {
                        const data = await response.json();
                        results.push(`🏃 ${data.activitiesCount} runs`);
                    } else {
                        results.push('🏃 sync failed');
                    }
                } catch {
                    results.push('🏃 sync error');
                }
            }

            // Sync Hevy
            if (hevyConnectionId) {
                try {
                    const response = await fetch('/api/hevy/sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ connectionId: hevyConnectionId }),
                    });

                    if (response.ok) {
                        const data = await response.json();
                        results.push(`🏋️ ${data.workoutsCount} workouts`);
                    } else {
                        results.push('🏋️ sync failed');
                    }
                } catch {
                    results.push('🏋️ sync error');
                }
            }

            setLastSyncMessage(`Synced: ${results.join(', ')}`);
            onSyncComplete?.();
        } catch (err) {
            setError('Sync failed');
        } finally {
            setIsSyncing(false);
        }
    };

    const hasConnections = stravaConnectionId || hevyConnectionId;

    if (!hasConnections) {
        return null;
    }

    return (
        <div className="flex items-center gap-3">
            <button
                onClick={handleSync}
                disabled={isSyncing}
                className="px-3 py-1.5 text-sm rounded-md font-medium transition-colors bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
                {isSyncing ? (
                    <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="none"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                        Syncing...
                    </>
                ) : (
                    <>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                        Sync Workouts
                    </>
                )}
            </button>

            {lastSyncMessage && (
                <span className="text-xs text-green-600 dark:text-green-400">{lastSyncMessage}</span>
            )}

            {error && (
                <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
            )}
        </div>
    );
}

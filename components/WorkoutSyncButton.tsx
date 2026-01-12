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
                className="px-3 py-1.5 text-sm rounded-md font-medium transition-colors bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
                {isSyncing ? 'Syncing...' : 'Sync Workouts'}
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

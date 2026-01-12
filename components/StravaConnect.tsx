'use client';

import { useState, useEffect } from 'react';

interface StravaConnectionInfo {
    id: string;
    athleteId: string;
    athleteName: string | null;
    lastSync: string | null;
    syncStatus: 'connected' | 'error' | 'pending';
    createdAt: string;
}

interface StravaConnectProps {
    connections: StravaConnectionInfo[];
    onConnectionChange?: () => void;
}

export default function StravaConnect({ connections, onConnectionChange }: StravaConnectProps) {
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Check for OAuth callback messages in URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);

        // Check for success
        if (params.get('strava') === 'connected') {
            setSuccess('Successfully connected to Strava!');
            // Clean up URL
            window.history.replaceState({}, '', window.location.pathname);
            onConnectionChange?.();
        }

        // Check for errors
        const errorParam = params.get('error');
        if (errorParam?.startsWith('strava_')) {
            const message = params.get('message') || 'Strava connection failed';
            setError(message);
            // Clean up URL
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [onConnectionChange]);

    const handleConnect = () => {
        window.location.href = '/api/auth/strava/authorize';
    };

    const handleDisconnect = async (connectionId: string) => {
        try {
            const response = await fetch(`/api/strava/connections?id=${connectionId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to disconnect');
            }

            setSuccess('Disconnected from Strava');
            onConnectionChange?.();
        } catch (err) {
            setError('Failed to disconnect from Strava');
        }
    };

    // If connected, show connection info
    if (connections.length > 0) {
        const connection = connections[0];
        return (
            <div className="space-y-2">
                {/* Error/Success messages */}
                {error && (
                    <div className="p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-md text-sm flex items-center justify-between">
                        <span>{error}</span>
                        <button onClick={() => setError(null)} className="text-red-600 dark:text-red-300 hover:text-red-800">
                            ✕
                        </button>
                    </div>
                )}
                {success && (
                    <div className="p-3 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-md text-sm flex items-center justify-between">
                        <span>{success}</span>
                        <button onClick={() => setSuccess(null)} className="text-green-600 dark:text-green-300 hover:text-green-800">
                            ✕
                        </button>
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-orange-500">🏃</span>
                        <span className="text-sm font-medium">{connection.athleteName || 'Strava Athlete'}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${connection.syncStatus === 'connected'
                                ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                                : connection.syncStatus === 'error'
                                    ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                                    : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                            }`}>
                            {connection.syncStatus}
                        </span>
                    </div>
                    <button
                        onClick={() => handleDisconnect(connection.id)}
                        className="text-xs text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                    >
                        Disconnect
                    </button>
                </div>
            </div>
        );
    }

    // Not connected - show connect button
    return (
        <div className="space-y-4">
            {/* Error/Success messages */}
            {error && (
                <div className="p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-md text-sm flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-red-600 dark:text-red-300 hover:text-red-800">
                        ✕
                    </button>
                </div>
            )}
            {success && (
                <div className="p-3 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-md text-sm flex items-center justify-between">
                    <span>{success}</span>
                    <button onClick={() => setSuccess(null)} className="text-green-600 dark:text-green-300 hover:text-green-800">
                        ✕
                    </button>
                </div>
            )}

            <div className="text-center py-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Connect your Strava account to sync running activities.
                </p>
                <button
                    onClick={handleConnect}
                    className="px-3 py-1.5 text-sm rounded-md font-medium transition-colors bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
                >
                    Connect Strava
                </button>
            </div>
        </div>
    );
}

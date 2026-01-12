'use client';

import { useState } from 'react';

interface HevyConnectionInfo {
    id: string;
    connectionName: string;
    lastSync: string | null;
    syncStatus: 'connected' | 'error' | 'pending';
    createdAt: string;
}

interface HevyConnectProps {
    connections: HevyConnectionInfo[];
    onConnectionChange?: () => void;
}

export default function HevyConnect({ connections, onConnectionChange }: HevyConnectProps) {
    const [apiKey, setApiKey] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!apiKey.trim()) {
            setError('Please enter your Hevy API key');
            return;
        }

        setIsConnecting(true);
        setError(null);

        try {
            const response = await fetch('/api/hevy/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiKey: apiKey.trim(),
                    connectionName: 'My Hevy',
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to connect');
            }

            setSuccess('Successfully connected to Hevy!');
            setApiKey('');
            setShowForm(false);
            onConnectionChange?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to connect to Hevy');
        } finally {
            setIsConnecting(false);
        }
    };

    const handleDisconnect = async (connectionId: string) => {
        try {
            const response = await fetch(`/api/hevy/connections?id=${connectionId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to disconnect');
            }

            setSuccess('Disconnected from Hevy');
            onConnectionChange?.();
        } catch (err) {
            setError('Failed to disconnect from Hevy');
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
                        <span className="text-purple-500">🏋️</span>
                        <span className="text-sm font-medium">{connection.connectionName}</span>
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

    // Not connected - show connect form
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

            {showForm ? (
                <form onSubmit={handleConnect} className="space-y-3">
                    <div>
                        <label htmlFor="hevy-api-key" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Hevy API Key
                        </label>
                        <input
                            id="hevy-api-key"
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Enter your Hevy API key"
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            disabled={isConnecting}
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Get your API key from{' '}
                            <a
                                href="https://hevy.com/settings?developer"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-purple-600 hover:underline"
                            >
                                Hevy Settings
                            </a>
                            {' '}(requires Hevy Pro)
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={isConnecting}
                            className="px-3 py-1.5 text-sm rounded-md font-medium transition-colors bg-purple-500 hover:bg-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isConnecting ? 'Connecting...' : 'Connect'}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setShowForm(false);
                                setApiKey('');
                                setError(null);
                            }}
                            className="px-3 py-1.5 text-sm rounded-md font-medium transition-colors bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            ) : (
                <div className="text-center py-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Connect your Hevy account to sync lifting workouts.
                    </p>
                    <button
                        onClick={() => setShowForm(true)}
                        className="px-3 py-1.5 text-sm rounded-md font-medium transition-colors bg-purple-500 hover:bg-purple-600 text-white cursor-pointer"
                    >
                        Connect Hevy
                    </button>
                </div>
            )}
        </div>
    );
}

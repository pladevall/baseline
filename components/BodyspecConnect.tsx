'use client';

import { useState, useEffect } from 'react';
import { BodyspecConnection } from '@/lib/types';

interface BodyspecConnectProps {
  connections: Omit<BodyspecConnection, 'accessToken' | 'refreshToken'>[];
  onConnectionChange?: () => void;
}

export default function BodyspecConnect({ connections, onConnectionChange }: BodyspecConnectProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Check for OAuth callback messages in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Check for success
    if (params.get('bodyspec') === 'connected') {
      setSuccess('Successfully connected to Bodyspec!');
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
      onConnectionChange?.();
    }

    // Check for errors
    const errorParam = params.get('error');
    if (errorParam) {
      const message = params.get('message') || 'Connection failed';
      setError(message);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [onConnectionChange]);

  const handleConnect = () => {
    window.location.href = `/api/auth/bodyspec/authorize?name=Bodyspec`;
  };

  // If connected, show nothing (parent handles the connected state UI)
  if (connections.length > 0) {
    return null;
  }

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
          Connect your Bodyspec account to sync DEXA scans.
        </p>
        <button
          onClick={handleConnect}
          className="px-3 py-1.5 text-sm rounded-md font-medium transition-colors bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 cursor-pointer"
        >
          Connect
        </button>
      </div>
    </div>
  );
}


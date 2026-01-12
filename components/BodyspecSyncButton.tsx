'use client';

import { useState, useCallback, useEffect } from 'react';
import { BodyspecConnection, BodyspecScan } from '@/lib/types';

interface BodyspecSyncButtonProps {
  connection: Omit<BodyspecConnection, 'accessToken'>;
  onSyncComplete?: () => void;
  className?: string;
}

export default function BodyspecSyncButton({
  connection,
  onSyncComplete,
  className = '',
}: BodyspecSyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastScan, setLastScan] = useState<BodyspecScan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  // Load last scan for this connection
  useEffect(() => {
    const loadLastScan = async () => {
      try {
        const response = await fetch(`/api/bodyspec/scans?connectionId=${connection.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.scans && data.scans.length > 0) {
            setLastScan(data.scans[0]); // Scans are ordered by date DESC
          }
        }
      } catch (err) {
        console.error('Error loading last scan:', err);
      }
    };
    loadLastScan();
  }, [connection.id]);

  const handleSync = useCallback(async () => {
    setError(null);
    setSyncResult(null);
    setIsSyncing(true);

    try {
      const response = await fetch('/api/bodyspec/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId: connection.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync');
      }

      if (data.scansSaved > 0) {
        setSyncResult(`Synced ${data.scansSaved} new scan${data.scansSaved > 1 ? 's' : ''}!`);
      } else {
        setSyncResult('No new scans found');
      }

      // Reload last scan
      const scansResponse = await fetch(`/api/bodyspec/scans?connectionId=${connection.id}`);
      if (scansResponse.ok) {
        const scansData = await scansResponse.json();
        if (scansData.scans && scansData.scans.length > 0) {
          setLastScan(scansData.scans[0]);
        }
      }

      onSyncComplete?.();

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSyncResult(null);
      }, 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSyncing(false);
    }
  }, [connection.id, onSyncComplete]);

  return (
    <div className={`flex items-center gap-3 flex-row-reverse ${className}`}>
      <button
        onClick={handleSync}
        disabled={isSyncing}
        className="px-3 py-1.5 text-sm rounded-md font-medium transition-colors bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isSyncing ? (
          'Syncing...'
        ) : (
          'Sync Now'
        )}
      </button>

      {/* Error message */}
      {error && (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      )}

      {/* Success message - positioned to the left of button */}
      {syncResult && (
        <span className="text-xs text-green-700 dark:text-green-500 font-medium animate-fade-out">
          {syncResult}
        </span>
      )}
    </div>
  );
}

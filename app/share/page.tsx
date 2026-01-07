'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { parsePDFFile } from '@/lib/client-pdf-parser';
import { saveEntryToDb } from '@/lib/supabase';

export default function SharePage() {
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing shared image...');

  useEffect(() => {
    // Handle shared files from service worker
    const handleSharedFile = async () => {
      try {
        // Check if there's a pending share in the cache
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          // Request the shared file from service worker
          const cache = await caches.open('shared-files');
          const keys = await cache.keys();

          if (keys.length > 0) {
            const response = await cache.match(keys[0]);
            if (response) {
              const blob = await response.blob();
              const file = new File([blob], 'shared-image.png', { type: blob.type });

              // Clear the cache
              await cache.delete(keys[0]);

              // Process the file
              setMessage('Scanning image...');
              const { entry } = await parsePDFFile(file, setMessage);

              const hasData = entry.weight > 0 || entry.bodyFatPercentage > 0 || entry.fitnessScore > 0;

              if (!hasData) {
                setStatus('error');
                setMessage('Could not extract data from image. Please try a clearer screenshot.');
                setTimeout(() => router.push('/'), 3000);
                return;
              }

              setMessage('Saving to cloud...');
              await saveEntryToDb(entry);

              setStatus('success');
              setMessage('Entry saved successfully!');
              setTimeout(() => router.push('/'), 1500);
              return;
            }
          }
        }

        // No shared file found, redirect home
        router.push('/');
      } catch (error) {
        console.error('Share processing error:', error);
        setStatus('error');
        setMessage('Failed to process image: ' + (error instanceof Error ? error.message : 'Unknown error'));
        setTimeout(() => router.push('/'), 3000);
      }
    };

    handleSharedFile();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8 max-w-sm w-full text-center">
        {status === 'processing' && (
          <div className="flex flex-col items-center gap-4">
            <svg
              className="w-8 h-8 text-gray-400 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-4">
            <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * POST /api/bodyspec/sync
 * Syncs scan data from Bodyspec API to local database
 */

import { NextRequest, NextResponse } from 'next/server';
import { createBodyspecClient, BodyspecAPIError } from '@/lib/bodyspec-client';
import { getConnection, updateSyncStatus, saveScans, updateConnectionTokens } from '@/lib/supabase-bodyspec';
import { refreshAccessToken } from '@/lib/oauth-config';

export async function POST(request: NextRequest) {
  let connectionId: string | undefined;

  try {
    const body = await request.json();
    connectionId = body.connectionId;
    const { startDate, endDate } = body;

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      );
    }

    // Fetch the connection to get the access token
    const connection = await getConnection(connectionId);

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Update status to pending
    await updateSyncStatus(connectionId, 'pending');

    let accessToken = connection.accessToken;

    // Helper function to perform the sync with a given token
    const performSync = async (token: string) => {
      const client = createBodyspecClient(token);
      return client.fetchAllScans({ startDate, endDate });
    };

    let appointments;

    try {
      // Try with the current token first
      appointments = await performSync(accessToken);
    } catch (error) {
      const apiError = error as BodyspecAPIError;

      // If unauthorized and we have a refresh token, try to refresh
      if ((apiError.status === 401 || apiError.status === 403) && connection.refreshToken) {
        console.log('Access token expired, attempting refresh...');

        try {
          const tokenResponse = await refreshAccessToken(connection.refreshToken);

          // Calculate new expiration time
          const expiresAt = new Date();
          expiresAt.setSeconds(expiresAt.getSeconds() + tokenResponse.expires_in);

          // Update stored tokens
          await updateConnectionTokens(connectionId, {
            accessToken: tokenResponse.access_token,
            refreshToken: tokenResponse.refresh_token || connection.refreshToken,
            tokenExpiresAt: expiresAt.toISOString(),
          });

          // Retry with the new token
          accessToken = tokenResponse.access_token;
          appointments = await performSync(accessToken);

          console.log('Token refreshed successfully, sync continuing...');
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          throw new Error('Session expired. Please reconnect your Bodyspec account.');
        }
      } else {
        // Re-throw if not a token issue or no refresh token
        throw error;
      }
    }

    // Save scans to database
    const savedScans = await saveScans(connectionId, appointments);

    // Update sync status to connected
    await updateSyncStatus(connectionId, 'connected');

    return NextResponse.json({
      success: true,
      scansFound: appointments.length,
      scansSaved: savedScans.length,
      scans: savedScans,
      lastSync: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error syncing Bodyspec data:', error);

    // Try to update status to error
    if (connectionId) {
      try {
        await updateSyncStatus(connectionId, 'error');
      } catch {
        // Ignore error updating status
      }
    }

    const errorMessage = error instanceof Error
      ? error.message
      : 'Failed to sync data from Bodyspec. Please try again.';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

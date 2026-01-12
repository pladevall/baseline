/**
 * GET /api/auth/strava/callback
 * Handles the OAuth 2.0 callback from Strava
 * 
 * 1. Validates state matches cookie (CSRF protection)
 * 2. Exchanges authorization code for tokens using client_secret
 * 3. Stores tokens and athlete info in database
 * 4. Clears auth cookies
 * 5. Redirects to home page with success message
 */

import { NextRequest, NextResponse } from 'next/server';
import { exchangeStravaCode } from '@/lib/strava-config';
import { saveStravaConnection } from '@/lib/supabase-strava';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const scope = searchParams.get('scope');

    // Get the base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Handle OAuth errors from Strava
    if (error) {
        console.error('Strava OAuth error:', error);
        const errorUrl = new URL('/', baseUrl);
        errorUrl.searchParams.set('error', 'strava_oauth_denied');
        errorUrl.searchParams.set('message', 'Strava authorization was denied');
        return NextResponse.redirect(errorUrl);
    }

    // Validate required parameters
    if (!code || !state) {
        const errorUrl = new URL('/', baseUrl);
        errorUrl.searchParams.set('error', 'strava_oauth_invalid');
        errorUrl.searchParams.set('message', 'Missing authorization code or state');
        return NextResponse.redirect(errorUrl);
    }

    // Get stored state from cookie for validation
    const storedState = request.cookies.get('strava_oauth_state')?.value;

    // Validate state (CSRF protection)
    if (!storedState || state !== storedState) {
        console.error('Strava OAuth state mismatch - possible CSRF attack');
        const errorUrl = new URL('/', baseUrl);
        errorUrl.searchParams.set('error', 'strava_oauth_state_mismatch');
        errorUrl.searchParams.set('message', 'Security validation failed. Please try again.');
        return NextResponse.redirect(errorUrl);
    }

    try {
        // Exchange code for tokens
        const tokens = await exchangeStravaCode(code);

        // Calculate token expiration time
        const expiresAt = new Date(tokens.expires_at * 1000);

        // Get athlete display name
        const athleteName = tokens.athlete.firstname && tokens.athlete.lastname
            ? `${tokens.athlete.firstname} ${tokens.athlete.lastname}`
            : tokens.athlete.username || null;

        // Save connection to database
        await saveStravaConnection({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            tokenExpiresAt: expiresAt.toISOString(),
            athleteId: tokens.athlete.id.toString(),
            athleteName,
        });

        // Create success redirect
        const successUrl = new URL('/', baseUrl);
        successUrl.searchParams.set('strava', 'connected');

        const response = NextResponse.redirect(successUrl);

        // Clear auth cookie
        response.cookies.delete('strava_oauth_state');

        return response;
    } catch (error) {
        console.error('Error exchanging Strava code for tokens:', error);
        const errorUrl = new URL('/', baseUrl);
        errorUrl.searchParams.set('error', 'strava_oauth_exchange_failed');
        errorUrl.searchParams.set('message', 'Failed to complete Strava authorization. Please try again.');
        return NextResponse.redirect(errorUrl);
    }
}

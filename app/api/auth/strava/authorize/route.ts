/**
 * GET /api/auth/strava/authorize
 * Initiates the Strava OAuth 2.0 authorization flow
 * 
 * 1. Generates random state for CSRF protection
 * 2. Stores state in secure httpOnly cookie
 * 3. Redirects user to Strava's authorization endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildStravaAuthUrl, generateState } from '@/lib/strava-config';

// Cookie settings for OAuth state
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 10, // 10 minutes
};

export async function GET(request: NextRequest) {
    try {
        // Generate state for CSRF protection
        const state = generateState();

        // Build the authorization URL
        const authUrl = buildStravaAuthUrl(state);

        // Create response with redirect
        const response = NextResponse.redirect(authUrl);

        // Store state in cookie for validation in callback
        response.cookies.set('strava_oauth_state', state, COOKIE_OPTIONS);

        return response;
    } catch (error) {
        console.error('Error initiating Strava OAuth flow:', error);

        // Redirect to home with error
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const errorUrl = new URL('/', baseUrl);
        errorUrl.searchParams.set('error', 'strava_oauth_init_failed');
        return NextResponse.redirect(errorUrl);
    }
}

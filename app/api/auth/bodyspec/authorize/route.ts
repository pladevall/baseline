/**
 * GET /api/auth/bodyspec/authorize
 * Initiates the OAuth 2.0 authorization flow with PKCE
 * 
 * 1. Generates PKCE code verifier and challenge
 * 2. Generates random state for CSRF protection
 * 3. Stores verifier and state in secure httpOnly cookies
 * 4. Redirects user to Bodyspec's authorization endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPKCEPair, generateState } from '@/lib/pkce';
import { buildAuthorizationUrl } from '@/lib/oauth-config';

// Cookie settings for OAuth state
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 10, // 10 minutes - enough time to complete auth
};

export async function GET(request: NextRequest) {
    try {
        // Generate PKCE pair
        const { verifier, challenge } = await createPKCEPair();

        // Generate state for CSRF protection
        const state = generateState();

        // Optional: Get connection name from query params
        const { searchParams } = new URL(request.url);
        const connectionName = searchParams.get('name') || 'My Bodyspec';

        // Build the authorization URL
        const authUrl = buildAuthorizationUrl(state, challenge);

        // Create response with redirect
        const response = NextResponse.redirect(authUrl);

        // Store PKCE verifier and state in cookies
        response.cookies.set('bodyspec_pkce_verifier', verifier, COOKIE_OPTIONS);
        response.cookies.set('bodyspec_oauth_state', state, COOKIE_OPTIONS);
        response.cookies.set('bodyspec_connection_name', connectionName, COOKIE_OPTIONS);

        return response;
    } catch (error) {
        console.error('Error initiating OAuth flow:', error);

        // Redirect to home with error
        const errorUrl = new URL('/', request.url);
        errorUrl.searchParams.set('error', 'oauth_init_failed');
        return NextResponse.redirect(errorUrl);
    }
}

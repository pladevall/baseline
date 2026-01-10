/**
 * GET /api/auth/bodyspec/callback
 * Handles the OAuth 2.0 callback from Bodyspec
 * 
 * 1. Validates state matches cookie (CSRF protection)
 * 2. Exchanges authorization code for tokens using PKCE verifier
 * 3. Stores tokens in database
 * 4. Clears auth cookies
 * 5. Redirects to home page with success message
 */

import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/oauth-config';
import { saveConnectionWithOAuth } from '@/lib/supabase-bodyspec';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Get the base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Handle OAuth errors from Bodyspec
    if (error) {
        console.error('OAuth error from Bodyspec:', error, errorDescription);
        const errorUrl = new URL('/', baseUrl);
        errorUrl.searchParams.set('error', 'oauth_denied');
        errorUrl.searchParams.set('message', errorDescription || 'Authorization was denied');
        return NextResponse.redirect(errorUrl);
    }

    // Validate required parameters
    if (!code || !state) {
        const errorUrl = new URL('/', baseUrl);
        errorUrl.searchParams.set('error', 'oauth_invalid');
        errorUrl.searchParams.set('message', 'Missing authorization code or state');
        return NextResponse.redirect(errorUrl);
    }

    // Get cookies for verification
    const storedState = request.cookies.get('bodyspec_oauth_state')?.value;
    const codeVerifier = request.cookies.get('bodyspec_pkce_verifier')?.value;
    const connectionName = request.cookies.get('bodyspec_connection_name')?.value || 'My Bodyspec';

    // Validate state (CSRF protection)
    if (!storedState || state !== storedState) {
        console.error('State mismatch - possible CSRF attack');
        const errorUrl = new URL('/', baseUrl);
        errorUrl.searchParams.set('error', 'oauth_state_mismatch');
        errorUrl.searchParams.set('message', 'Security validation failed. Please try again.');
        return NextResponse.redirect(errorUrl);
    }

    // Validate we have the PKCE verifier
    if (!codeVerifier) {
        console.error('Missing PKCE code verifier');
        const errorUrl = new URL('/', baseUrl);
        errorUrl.searchParams.set('error', 'oauth_pkce_missing');
        errorUrl.searchParams.set('message', 'Session expired. Please try again.');
        return NextResponse.redirect(errorUrl);
    }

    try {
        // Exchange code for tokens
        const tokens = await exchangeCodeForTokens(code, codeVerifier);

        // Calculate token expiration time
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

        // Save connection to database
        await saveConnectionWithOAuth({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            tokenExpiresAt: expiresAt.toISOString(),
            tokenName: connectionName,
            syncStatus: 'connected',
        });

        // Create success redirect
        const successUrl = new URL('/', baseUrl);
        successUrl.searchParams.set('bodyspec', 'connected');

        const response = NextResponse.redirect(successUrl);

        // Clear auth cookies
        response.cookies.delete('bodyspec_pkce_verifier');
        response.cookies.delete('bodyspec_oauth_state');
        response.cookies.delete('bodyspec_connection_name');

        return response;
    } catch (error) {
        console.error('Error exchanging code for tokens:', error);
        const errorUrl = new URL('/', baseUrl);
        errorUrl.searchParams.set('error', 'oauth_exchange_failed');
        errorUrl.searchParams.set('message', 'Failed to complete authorization. Please try again.');
        return NextResponse.redirect(errorUrl);
    }
}

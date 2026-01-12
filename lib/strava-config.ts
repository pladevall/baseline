/**
 * Strava OAuth 2.0 Configuration
 * Server-side OAuth flow with client secret (not PKCE)
 */

export const STRAVA_OAUTH = {
    // Authorization endpoint
    authorizationUrl: 'https://www.strava.com/oauth/authorize',

    // Token endpoint (exchange code for tokens, refresh tokens)
    tokenUrl: 'https://www.strava.com/api/v3/oauth/token',

    // Client credentials
    clientId: process.env.STRAVA_CLIENT_ID || '',
    clientSecret: process.env.STRAVA_CLIENT_SECRET || '',

    // Scopes: read basic profile and activities
    scopes: ['read', 'activity:read'],

    // Callback URL
    get redirectUri() {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        return `${baseUrl}/api/auth/strava/callback`;
    },
};

/**
 * Build the Strava authorization URL
 */
export function buildStravaAuthUrl(state: string): string {
    const params = new URLSearchParams({
        client_id: STRAVA_OAUTH.clientId,
        response_type: 'code',
        scope: STRAVA_OAUTH.scopes.join(','),
        redirect_uri: STRAVA_OAUTH.redirectUri,
        state: state,
        approval_prompt: 'auto', // 'force' to always show consent screen
    });

    return `${STRAVA_OAUTH.authorizationUrl}?${params.toString()}`;
}

/**
 * Token response from Strava
 */
export interface StravaTokenResponse {
    token_type: 'Bearer';
    access_token: string;
    refresh_token: string;
    expires_at: number;    // Unix timestamp (seconds)
    expires_in: number;    // Seconds until expiration
    athlete: {
        id: number;
        username: string | null;
        firstname: string;
        lastname: string;
        city: string | null;
        state: string | null;
        country: string | null;
        profile: string;      // Profile image URL
        profile_medium: string;
    };
}

/**
 * Exchange authorization code for tokens
 * Strava uses client_id + client_secret, not PKCE
 */
export async function exchangeStravaCode(code: string): Promise<StravaTokenResponse> {
    const response = await fetch(STRAVA_OAUTH.tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_id: STRAVA_OAUTH.clientId,
            client_secret: STRAVA_OAUTH.clientSecret,
            code: code,
            grant_type: 'authorization_code',
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('Strava token exchange failed:', error);
        throw new Error(`Strava token exchange failed: ${response.status}`);
    }

    return response.json();
}

/**
 * Refresh an expired access token
 * Strava tokens expire after 6 hours
 */
export async function refreshStravaToken(refreshToken: string): Promise<StravaTokenResponse> {
    const response = await fetch(STRAVA_OAUTH.tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_id: STRAVA_OAUTH.clientId,
            client_secret: STRAVA_OAUTH.clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('Strava token refresh failed:', error);
        throw new Error(`Strava token refresh failed: ${response.status}`);
    }

    return response.json();
}

/**
 * Generate a random state string for CSRF protection
 */
export function generateState(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

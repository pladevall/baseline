/**
 * Bodyspec OAuth 2.0 Configuration
 * Using OIDC-compliant endpoints from Bodyspec's Keycloak auth server
 */

export const BODYSPEC_OAUTH = {
  // Authorization endpoint - where users are redirected to login
  authorizationUrl: 'https://auth.bodyspec.com/realms/bodyspec/protocol/openid-connect/auth',
  
  // Token endpoint - where we exchange auth code for tokens
  tokenUrl: 'https://auth.bodyspec.com/realms/bodyspec/protocol/openid-connect/token',
  
  // Client ID from Bodyspec API docs (public client for PKCE flow)
  clientId: process.env.NEXT_PUBLIC_BODYSPEC_CLIENT_ID || 'bodyspec-api-ext-v1',
  
  // OAuth scopes required for API access
  scopes: ['openid', 'profile', 'email'],
  
  // Callback URL - must match registered redirect URI
  get redirectUri() {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${baseUrl}/api/auth/bodyspec/callback`;
  },
};

/**
 * Build the authorization URL with all required parameters
 */
export function buildAuthorizationUrl(state: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    client_id: BODYSPEC_OAUTH.clientId,
    response_type: 'code',
    scope: BODYSPEC_OAUTH.scopes.join(' '),
    redirect_uri: BODYSPEC_OAUTH.redirectUri,
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `${BODYSPEC_OAUTH.authorizationUrl}?${params.toString()}`;
}

/**
 * Token response from Bodyspec OAuth server
 */
export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  id_token?: string;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string
): Promise<TokenResponse> {
  const response = await fetch(BODYSPEC_OAUTH.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: BODYSPEC_OAUTH.clientId,
      code: code,
      redirect_uri: BODYSPEC_OAUTH.redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json();
}

/**
 * Refresh an access token using a refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const response = await fetch(BODYSPEC_OAUTH.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: BODYSPEC_OAUTH.clientId,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  return response.json();
}

/**
 * PKCE (Proof Key for Code Exchange) Utilities
 * 
 * PKCE provides enhanced security for OAuth 2.0 public clients by:
 * 1. Generating a random code verifier
 * 2. Creating a SHA-256 hash (code challenge) sent with auth request
 * 3. Sending the original verifier with token exchange
 * 
 * This prevents authorization code interception attacks.
 */

/**
 * Generate a cryptographically secure random string for the code verifier
 * Must be between 43-128 characters, using unreserved URI characters
 */
export function generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return base64URLEncode(array);
}

/**
 * Generate the code challenge from a code verifier using SHA-256
 * The challenge is sent with the authorization request
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return base64URLEncode(new Uint8Array(digest));
}

/**
 * Generate a random state parameter for CSRF protection
 */
export function generateState(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return base64URLEncode(array);
}

/**
 * Base64 URL encoding (RFC 4648)
 * Replaces + with -, / with _, and removes padding =
 */
function base64URLEncode(buffer: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < buffer.length; i++) {
        binary += String.fromCharCode(buffer[i]);
    }

    const base64 = btoa(binary);
    return base64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

/**
 * Create a complete PKCE pair (verifier and challenge)
 * Use this when initiating an OAuth flow
 */
export async function createPKCEPair(): Promise<{ verifier: string; challenge: string }> {
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    return { verifier, challenge };
}

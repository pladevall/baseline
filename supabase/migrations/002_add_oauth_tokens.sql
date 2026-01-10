-- Migration: Add OAuth token fields to bodyspec_connections
-- This migration adds support for OAuth 2.0 token management

-- Add refresh_token column for token refresh capability
ALTER TABLE bodyspec_connections
ADD COLUMN IF NOT EXISTS refresh_token TEXT;

-- Add token_expires_at column to track when access token expires
ALTER TABLE bodyspec_connections
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

-- Comment on new columns
COMMENT ON COLUMN bodyspec_connections.refresh_token IS 'OAuth2 refresh token for obtaining new access tokens';
COMMENT ON COLUMN bodyspec_connections.token_expires_at IS 'Timestamp when the access token expires';

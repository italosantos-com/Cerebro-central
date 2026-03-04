// src/lib/google/oauth.ts
/**
 * @fileOverview Google OAuth2 configuration and initialization
 * Provides OAuth2 client setup for Google Photos and Drive integration
 */

import { google } from 'googleapis';

/**
 * Creates and returns a configured OAuth2 client
 * @returns Configured OAuth2 client instance
 */
export function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured');
  }

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );
}

/**
 * Required scopes for Google Photos and Drive integration
 */
export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/photoslibrary.appendonly', // Upload to Photos
  'https://www.googleapis.com/auth/drive.file', // Upload to Drive (files created by app only)
];

/**
 * Generates the authorization URL for OAuth flow
 * @param state - State parameter for CSRF protection (usually uid)
 * @returns Authorization URL
 */
export function getAuthorizationUrl(state: string): string {
  const oauth2Client = getOAuth2Client();
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Required for refresh token
    scope: GOOGLE_SCOPES,
    state,
    prompt: 'consent', // Force consent screen to ensure refresh token
  });
}

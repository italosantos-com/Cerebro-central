// src/lib/google/tokens.ts
/**
 * @fileOverview Token management with automatic refresh
 * Handles OAuth token storage and automatic refresh when expired
 */

import { google } from 'googleapis';
import { getAdminDb } from '@/lib/firebase-admin';
import { getOAuth2Client } from './oauth';

/**
 * Gets a valid Google OAuth2 client with automatic token refresh
 * @param uid - User ID
 * @returns Configured OAuth2 client with valid tokens
 * @throws Error if user tokens not found or refresh fails
 */
export async function getValidGoogleClient(uid: string) {
  const adminDb = getAdminDb();
  
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  // Get stored tokens from Firestore
  const tokenDoc = await adminDb
    .doc(`users/${uid}/integrations/google`)
    .get();

  if (!tokenDoc.exists) {
    throw new Error('Google integration not found for user. User must authenticate first.');
  }

  const tokenData = tokenDoc.data();
  if (!tokenData) {
    throw new Error('Invalid token data');
  }

  // Create OAuth2 client
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials(tokenData);

  // Check if token is expired or about to expire (within 5 minutes)
  const expiryDate = tokenData.expiry_date || 0;
  const now = Date.now();
  const fiveMinutesFromNow = now + (5 * 60 * 1000);

  if (expiryDate <= fiveMinutesFromNow) {
    console.log(`[Google Tokens] Token expired or expiring soon for user ${uid}, refreshing...`);
    
    try {
      // Refresh the access token
      const refreshResponse = await oauth2Client.refreshAccessToken();
      const newTokens = refreshResponse.credentials;

      // Update tokens in Firestore
      await adminDb
        .doc(`users/${uid}/integrations/google`)
        .update({
          access_token: newTokens.access_token,
          expiry_date: newTokens.expiry_date,
          // Only update refresh_token if a new one is provided
          ...(newTokens.refresh_token && { refresh_token: newTokens.refresh_token }),
        });

      // Set the new credentials
      oauth2Client.setCredentials(newTokens);
      
      console.log(`[Google Tokens] Token refreshed successfully for user ${uid}`);
    } catch (error) {
      console.error(`[Google Tokens] Failed to refresh token for user ${uid}:`, error);
      throw new Error('Failed to refresh Google token. User may need to re-authenticate.');
    }
  }

  return oauth2Client;
}

/**
 * Checks if a user has Google integration configured
 * @param uid - User ID
 * @returns True if user has Google tokens stored
 */
export async function hasGoogleIntegration(uid: string): Promise<boolean> {
  const adminDb = getAdminDb();
  
  if (!adminDb) {
    return false;
  }

  const tokenDoc = await adminDb
    .doc(`users/${uid}/integrations/google`)
    .get();

  return tokenDoc.exists;
}

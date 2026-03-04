// src/app/api/google/callback/route.ts
/**
 * @fileOverview Google OAuth callback endpoint
 * Handles OAuth callback and stores tokens in Firestore
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getOAuth2Client, GOOGLE_SCOPES } from '@/lib/google/oauth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Get stored state from cookie
    const savedState = request.cookies.get('google_oauth_state')?.value;

    // Handle OAuth error
    if (error) {
      console.error('[Google Callback] OAuth error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'google_oauth_error',
          message: `OAuth error: ${error}`,
        },
        { status: 400 }
      );
    }

    // Validate state and code
    if (!code || !state || !savedState || state !== savedState) {
      console.error('[Google Callback] Invalid state or code');
      return NextResponse.json(
        {
          success: false,
          error: 'invalid_request',
          message: 'Invalid OAuth callback parameters',
        },
        { status: 400 }
      );
    }

    const uid = state; // State contains the uid

    // Exchange code for tokens
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Missing tokens in OAuth response');
    }

    // Store tokens in Firestore
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      throw new Error('Firebase Admin not initialized');
    }

    await adminDb.doc(`users/${uid}/integrations/google`).set({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      scope: tokens.scope || GOOGLE_SCOPES.join(' '),
      token_type: tokens.token_type || 'Bearer',
      expiry_date: tokens.expiry_date || Date.now() + (tokens.expires_in || 3600) * 1000,
      createdAt: new Date(),
    });

    console.log(`[Google Callback] Successfully stored tokens for user ${uid}`);

    // Clear the state cookie
    const response = NextResponse.json({
      success: true,
      message: 'Google account connected successfully',
    });
    
    response.cookies.delete('google_oauth_state');

    return response;
  } catch (error) {
    console.error('[Google Callback] Error:', error);
    
    // Clear the state cookie even on error
    const response = NextResponse.json(
      {
        success: false,
        error: 'callback_failed',
        message: error instanceof Error ? error.message : 'Failed to complete OAuth',
      },
      { status: 500 }
    );
    
    response.cookies.delete('google_oauth_state');
    
    return response;
  }
}

// src/app/api/google/login/route.ts
/**
 * @fileOverview Google OAuth login endpoint
 * Initiates OAuth flow for user-specific Google integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationUrl } from '@/lib/google/oauth';

export async function GET(request: NextRequest) {
  try {
    // Get uid from query parameters
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');

    if (!uid) {
      return NextResponse.json(
        { success: false, error: 'Missing uid parameter' },
        { status: 400 }
      );
    }

    // Generate authorization URL with uid as state
    const authUrl = getAuthorizationUrl(uid);

    // Store state in cookie for validation
    const response = NextResponse.redirect(authUrl);
    response.cookies.set('google_oauth_state', uid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 15, // 15 minutes
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[Google Login] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to initiate Google OAuth',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

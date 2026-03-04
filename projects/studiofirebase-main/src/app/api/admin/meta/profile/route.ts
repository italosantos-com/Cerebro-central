/**
 * API Route: Save Meta (Facebook/Instagram) Profile
 * POST /api/admin/meta/profile
 * Saves user profile data from Facebook or Instagram authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, profile } = body;

    console.log('[Meta Profile API] Received data:', { userId, profile });

    // Validate required fields
    if (!userId || !profile) {
      return NextResponse.json(
        { error: 'userId and profile are required' },
        { status: 400 }
      );
    }

    if (!profile.id || !profile.name || !profile.platform) {
      return NextResponse.json(
        { error: 'profile must contain id, name, and platform' },
        { status: 400 }
      );
    }

    // Save to Firestore users collection
    const userRef = adminDb.collection('users').doc(userId);
    
    const userData: any = {
      displayName: profile.name,
      email: profile.email,
      photoURL: profile.picture || '',
      provider: profile.platform === 'facebook' ? 'facebook' : 'instagram',
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Add platform-specific data
    if (profile.platform === 'facebook') {
      userData.facebookId = profile.id;
    } else if (profile.platform === 'instagram') {
      userData.instagramId = profile.id;
    }

    // Check if document exists
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      userData.createdAt = FieldValue.serverTimestamp();
    }

    await userRef.set(userData, { merge: true });

    console.log('[Meta Profile API] Profile saved successfully');

    return NextResponse.json({
      success: true,
      message: 'Profile saved successfully',
    });

  } catch (error) {
    console.error('[Meta Profile API] Error saving profile:', error);
    return NextResponse.json(
      { error: 'Failed to save profile' },
      { status: 500 }
    );
  }
}

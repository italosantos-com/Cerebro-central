// src/app/api/upload/photo/route.ts
/**
 * @fileOverview Photo upload endpoint
 * Uploads images to Google Photos via user's OAuth tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getValidGoogleClient } from '@/lib/google/tokens';
import { uploadToPhotos, getPhotosImageUrl } from '@/lib/google/photos';

// Ensure Node runtime for file handling
export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get uid from headers or body
    const uid = request.headers.get('x-user-id') || request.headers.get('uid');

    if (!uid) {
      return NextResponse.json(
        { success: false, error: 'Missing user ID' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'File must be an image' },
        { status: 400 }
      );
    }

    console.log(`[Photo Upload] Uploading ${file.name} for user ${uid}`);

    // Get valid Google client with automatic token refresh
    const auth = await getValidGoogleClient(uid);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Google Photos
    const result = await uploadToPhotos(auth, buffer, file.name, file.type);

    // Store metadata in Firestore
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      throw new Error('Firebase Admin not initialized');
    }

    const mediaRef = await adminDb.collection(`users/${uid}/media`).add({
      provider: 'photos',
      providerId: result.mediaItemId,
      type: 'image',
      fileName: file.name,
      mimeType: file.type,
      baseUrl: result.baseUrl,
      productUrl: result.productUrl,
      createdAt: new Date(),
    });

    console.log(`[Photo Upload] Successfully uploaded to Google Photos: ${result.mediaItemId}`);

    return NextResponse.json({
      success: true,
      mediaId: mediaRef.id,
      providerId: result.mediaItemId,
      baseUrl: result.baseUrl,
      // Generate sized URLs for common use cases
      urls: {
        thumbnail: getPhotosImageUrl(result.baseUrl, 400),
        medium: getPhotosImageUrl(result.baseUrl, 1080),
        large: getPhotosImageUrl(result.baseUrl, 1920),
      },
      productUrl: result.productUrl,
    });
  } catch (error) {
    console.error('[Photo Upload] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'upload_failed',
        message: error instanceof Error ? error.message : 'Failed to upload photo',
      },
      { status: 500 }
    );
  }
}

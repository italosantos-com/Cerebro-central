// src/app/api/upload/video/route.ts
/**
 * @fileOverview Video upload endpoint
 * Uploads videos to Google Drive via user's OAuth tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getValidGoogleClient } from '@/lib/google/tokens';
import { uploadToDrive, getDriveDownloadUrl, getDriveEmbedUrl } from '@/lib/google/drive';

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
    if (!file.type.startsWith('video/')) {
      return NextResponse.json(
        { success: false, error: 'File must be a video' },
        { status: 400 }
      );
    }

    console.log(`[Video Upload] Uploading ${file.name} for user ${uid}`);

    // Get valid Google client with automatic token refresh
    const auth = await getValidGoogleClient(uid);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Google Drive
    const result = await uploadToDrive(auth, buffer, file.name, file.type);

    // Store metadata in Firestore
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      throw new Error('Firebase Admin not initialized');
    }

    const mediaRef = await adminDb.collection(`users/${uid}/media`).add({
      provider: 'drive',
      providerId: result.fileId,
      type: 'video',
      fileName: file.name,
      mimeType: file.type,
      webViewLink: result.webViewLink,
      webContentLink: result.webContentLink,
      createdAt: new Date(),
    });

    console.log(`[Video Upload] Successfully uploaded to Google Drive: ${result.fileId}`);

    return NextResponse.json({
      success: true,
      mediaId: mediaRef.id,
      providerId: result.fileId,
      webViewLink: result.webViewLink,
      webContentLink: result.webContentLink,
      // Generate direct and embed URLs
      urls: {
        download: getDriveDownloadUrl(result.fileId),
        embed: getDriveEmbedUrl(result.fileId),
        view: result.webViewLink,
      },
    });
  } catch (error) {
    console.error('[Video Upload] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'upload_failed',
        message: error instanceof Error ? error.message : 'Failed to upload video',
      },
      { status: 500 }
    );
  }
}

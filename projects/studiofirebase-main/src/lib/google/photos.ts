// src/lib/google/photos.ts
/**
 * @fileOverview Google Photos upload functionality
 * Handles image uploads to Google Photos library
 */

import { OAuth2Client } from 'google-auth-library';

/**
 * Upload an image to Google Photos
 * @param auth - Authenticated OAuth2 client
 * @param file - File buffer
 * @param fileName - Name for the file
 * @param mimeType - MIME type of the image
 * @returns Media item with baseUrl
 */
export async function uploadToPhotos(
  auth: OAuth2Client,
  file: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ mediaItemId: string; baseUrl: string; productUrl: string }> {
  // Step 1: Upload bytes to Google Photos
  const uploadToken = await uploadBytes(auth, file);

  // Step 2: Create media item from upload token
  const mediaItem = await createMediaItem(auth, uploadToken, fileName);

  return {
    mediaItemId: mediaItem.id,
    baseUrl: mediaItem.baseUrl,
    productUrl: mediaItem.productUrl,
  };
}

/**
 * Upload raw bytes to Google Photos
 * @param auth - Authenticated OAuth2 client
 * @param file - File buffer
 * @returns Upload token
 */
async function uploadBytes(auth: OAuth2Client, file: Buffer): Promise<string> {
  const credentials = await auth.getAccessToken();
  const accessToken = credentials.token;

  if (!accessToken) {
    throw new Error('No access token available');
  }

  const response = await fetch('https://photoslibrary.googleapis.com/v1/uploads', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
      'X-Goog-Upload-Protocol': 'raw',
    },
    body: file,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload to Google Photos: ${response.status} ${errorText}`);
  }

  const uploadToken = await response.text();
  return uploadToken;
}

/**
 * Create a media item from an upload token
 * @param auth - Authenticated OAuth2 client
 * @param uploadToken - Upload token from uploadBytes
 * @param description - Description for the media item
 * @returns Created media item
 */
async function createMediaItem(
  auth: OAuth2Client,
  uploadToken: string,
  description: string
): Promise<{ id: string; baseUrl: string; productUrl: string }> {
  const credentials = await auth.getAccessToken();
  const accessToken = credentials.token;

  if (!accessToken) {
    throw new Error('No access token available');
  }

  const response = await fetch('https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      newMediaItems: [
        {
          description,
          simpleMediaItem: {
            uploadToken,
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create media item: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.newMediaItemResults || data.newMediaItemResults.length === 0) {
    throw new Error('No media items created');
  }

  const result = data.newMediaItemResults[0];
  
  if (result.status?.message !== 'Success' && result.status?.message !== 'OK') {
    throw new Error(`Media item creation failed: ${result.status?.message || 'Unknown error'}`);
  }

  const mediaItem = result.mediaItem;
  
  return {
    id: mediaItem.id,
    baseUrl: mediaItem.baseUrl,
    productUrl: mediaItem.productUrl,
  };
}

/**
 * Generate a sized URL for a Google Photos image
 * @param baseUrl - Base URL from Google Photos
 * @param width - Desired width (e.g., 1080)
 * @returns Sized image URL
 */
export function getPhotosImageUrl(baseUrl: string, width: number = 1080): string {
  return `${baseUrl}=w${width}`;
}

// src/lib/google/drive.ts
/**
 * @fileOverview Google Drive upload functionality
 * Handles video uploads to Google Drive with public permissions
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Readable } from 'stream';

/**
 * Upload a video file to Google Drive
 * @param auth - Authenticated OAuth2 client
 * @param file - File buffer
 * @param fileName - Name for the file
 * @param mimeType - MIME type of the file
 * @returns Google Drive file ID and web view link
 */
export async function uploadToDrive(
  auth: OAuth2Client,
  file: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ fileId: string; webViewLink: string; webContentLink: string }> {
  const drive = google.drive({ version: 'v3', auth });

  // Create a readable stream from the buffer
  const stream = Readable.from(file);

  // Upload file to Drive
  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType,
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id, webViewLink, webContentLink',
  });

  const fileId = response.data.id;
  
  if (!fileId) {
    throw new Error('Failed to upload file to Google Drive');
  }

  // Make the file publicly accessible
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });

  return {
    fileId,
    webViewLink: response.data.webViewLink || '',
    webContentLink: response.data.webContentLink || '',
  };
}

/**
 * Generate a direct download URL for a Google Drive file
 * @param fileId - Google Drive file ID
 * @returns Direct download URL
 */
export function getDriveDownloadUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

/**
 * Generate an embed URL for a Google Drive video
 * @param fileId - Google Drive file ID
 * @returns Embed URL
 */
export function getDriveEmbedUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

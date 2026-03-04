import { getAdminApp } from '@/lib/firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import { normalizeFirebaseStorageUrl } from '@/lib/firebase-storage-url';

export const DEFAULT_PROFILE_IMAGE = '/placeholder-photo.svg';
export const DEFAULT_COVER_IMAGE = '/placeholder-cover.svg';

const SIGNED_URL_TTL_MS = 60 * 60 * 1000; // 1 hora

const FIREBASE_HOSTS = new Set([
  'firebasestorage.googleapis.com',
  'storage.googleapis.com'
]);

const FALLBACK_BUCKET = (
  process.env.FIREBASE_STORAGE_BUCKET ||
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  process.env.FIREBASE_STORAGE_BUCKET_URL?.replace('gs://', '') ||
  (process.env.FIREBASE_PROJECT_ID ? `${process.env.FIREBASE_PROJECT_ID}.appspot.com` : undefined)
);

type GalleryPhoto = {
  url?: string | null;
};

type SettingsWithImages = {
  profilePictureUrl?: string | null;
  coverPhotoUrl?: string | null;
  galleryPhotos?: GalleryPhoto[];
};

function parseFirebaseStorageUrl(imageUrl: string) {
  try {
    const parsed = new URL(imageUrl);
    if (!FIREBASE_HOSTS.has(parsed.hostname)) {
      return null;
    }

    // firebasestorage.googleapis.com/v0/b/<bucket>/o/<object>
    const v0Match = parsed.pathname.match(/\/v0\/b\/([^/]+)\/o\/(.+)/);
    if (v0Match) {
      const [, bucket, objectPath] = v0Match;
      return {
        bucket,
        objectPath: decodeURIComponent(objectPath)
      };
    }

    // storage.googleapis.com/<bucket>/<object>
    const gcsMatch = parsed.pathname.match(/^\/([^/]+)\/(.+)$/);
    if (parsed.hostname === 'storage.googleapis.com' && gcsMatch) {
      const [, bucket, objectPath] = gcsMatch;
      return {
        bucket,
        objectPath: decodeURIComponent(objectPath)
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}

async function ensureImageUrl(imageUrl: string | undefined | null, fallback: string) {
  if (!imageUrl) {
    return fallback;
  }

  if (imageUrl.startsWith('/')) {
    return imageUrl;
  }

  const normalizedUrl = normalizeFirebaseStorageUrl(imageUrl);
  const parsed = parseFirebaseStorageUrl(normalizedUrl);
  if (!parsed) {
    return normalizedUrl;
  }

  try {
    const adminApp = getAdminApp();
    if (!adminApp) {
      return imageUrl;
    }

    const storage = getStorage(adminApp);
    const bucketName = (parsed.bucket || FALLBACK_BUCKET)?.replace(/\.firebasestorage\.app$/i, '.appspot.com');

    if (!bucketName) {
      return imageUrl;
    }

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(parsed.objectPath);
    const [exists] = await file.exists();

    if (!exists) {
      return fallback;
    }

    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + SIGNED_URL_TTL_MS
    });

    return signedUrl;
  } catch (error) {
    console.error('[Profile Settings] Falha ao gerar Signed URL:', error);
    return fallback;
  }
}

export async function ensureFirebaseImageAccess<T extends SettingsWithImages>(settings: T): Promise<T> {
  settings.profilePictureUrl = await ensureImageUrl(settings.profilePictureUrl, DEFAULT_PROFILE_IMAGE);
  settings.coverPhotoUrl = await ensureImageUrl(settings.coverPhotoUrl, DEFAULT_COVER_IMAGE);

  if (!Array.isArray(settings.galleryPhotos)) {
    settings.galleryPhotos = [];
  } else {
    settings.galleryPhotos = await Promise.all(
      settings.galleryPhotos.map(async (photo) => ({
        ...photo,
        url: await ensureImageUrl(photo?.url, DEFAULT_PROFILE_IMAGE)
      }))
    );
  }

  return settings;
}

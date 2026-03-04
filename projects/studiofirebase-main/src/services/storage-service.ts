// server-only storage helper (no "use server" directive so we can export types if needed)
import { storage } from '../lib/firebase';
import { ref, listAll, getDownloadURL } from 'firebase/storage';

/**
 * List media files from a specific path in Firebase Storage
 * @param path The path to list media from
 * @returns Array of download URLs for the media files
 */
export async function listMedia(path: string): Promise<string[]> {
    try {
        const storageRef = ref(storage, path);
        const result = await listAll(storageRef);

        // Get download URLs for all items
        const downloadUrls = await Promise.all(
            result.items.map(async (item) => {
                try {
                    const url = await getDownloadURL(item);
                    return url;
                } catch (error) {
                    console.error(`Failed to get download URL for ${item.fullPath}:`, error);
                    return null;
                }
            })
        );

        // Filter out any failed URLs
        return downloadUrls.filter((url): url is string => url !== null);
    } catch (error: any) {
        console.warn('Warning: Failed to list media from storage (likely due to build environment). Returning empty list.', error.message);
        return [];
    }
}
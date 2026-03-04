import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';
import { getAdminDb } from '@/lib/firebase-admin';

type GalleryItem = {
    id: string;
    name?: string;
    baseUrl?: string;
    mimeType?: string;
    thumbnailLink?: string;
    webContentLink?: string;
    source: 'photos' | 'drive';
};

async function refreshGoogleAccessToken(refreshToken: string) {
    const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('Credenciais do Google Calendar não configuradas');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || tokenData.error) {
        throw new Error(tokenData?.error_description || tokenData?.error || 'Falha ao renovar token Google');
    }

    return {
        accessToken: String(tokenData.access_token || ''),
        expiresIn: Number(tokenData.expires_in || 0),
    };
}

async function fetchGooglePhotos(accessToken: string, pageSize: number): Promise<GalleryItem[]> {
    const photosResponse = await fetch(
        `https://photoslibrary.googleapis.com/v1/mediaItems?pageSize=${pageSize}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            cache: 'no-store',
        }
    );

    const photosData = await photosResponse.json();
    if (!photosResponse.ok) {
        throw new Error(photosData?.error?.message || 'Falha ao buscar mídia no Google Photos');
    }

    const mediaItems = Array.isArray(photosData?.mediaItems) ? photosData.mediaItems : [];
    return mediaItems
        .filter((item: any) => typeof item?.baseUrl === 'string')
        .map((item: any) => ({
            id: String(item.id || item.mediaMetadata?.creationTime || Math.random()),
            name: item.filename || 'Google Photo',
            baseUrl: item.baseUrl,
            mimeType: item.mimeType,
            source: 'photos' as const,
        }));
}

async function fetchPublicDrive(pageSize: number): Promise<GalleryItem[]> {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!folderId || !apiKey) {
        return [];
    }

    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', `'${folderId}' in parents and mimeType contains 'image/' and trashed=false`);
    url.searchParams.set('fields', 'files(id,name,mimeType,thumbnailLink,webContentLink)');
    url.searchParams.set('pageSize', String(pageSize));
    url.searchParams.set('key', apiKey);

    const driveResponse = await fetch(url.toString(), { cache: 'no-store' });
    const driveData = await driveResponse.json();

    if (!driveResponse.ok) {
        throw new Error(driveData?.error?.message || 'Falha ao buscar mídia no Google Drive público');
    }

    const files = Array.isArray(driveData?.files) ? driveData.files : [];
    return files.map((file: any) => ({
        id: String(file.id || Math.random()),
        name: file.name || 'Google Drive Image',
        mimeType: file.mimeType,
        thumbnailLink: file.thumbnailLink,
        webContentLink: file.webContentLink,
        source: 'drive' as const,
    }));
}

export async function GET(request: NextRequest) {
    const authResult = await requireAdminApiAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const pageSizeParam = request.nextUrl.searchParams.get('pageSize');
    const parsedPageSize = Number(pageSizeParam || 30);
    const pageSize = Number.isFinite(parsedPageSize)
        ? Math.max(1, Math.min(parsedPageSize, 100))
        : 30;

    const adminDb = getAdminDb();
    if (!adminDb) {
        return NextResponse.json({ success: false, message: 'Firestore Admin não configurado' }, { status: 500 });
    }

    const calendarDocRef = adminDb.collection('admins').doc(authResult.uid).collection('integrations').doc('calendar');
    const calendarSnap = await calendarDocRef.get();
    const calendarData = calendarSnap.exists ? (calendarSnap.data() || {}) : {};

    const googleData = calendarData.google || {};
    let accessToken = typeof googleData.accessToken === 'string' ? googleData.accessToken : '';
    const refreshToken = typeof googleData.refreshToken === 'string' ? googleData.refreshToken : '';

    if (googleData.connected && accessToken) {
        try {
            const photos = await fetchGooglePhotos(accessToken, pageSize);
            if (photos.length > 0) {
                return NextResponse.json({ success: true, source: 'photos', items: photos });
            }
        } catch (error: any) {
            const message = String(error?.message || '');
            const requiresRefresh =
                message.toLowerCase().includes('unauthenticated') ||
                message.toLowerCase().includes('invalid credentials') ||
                message.toLowerCase().includes('invalid_grant');

            if (requiresRefresh && refreshToken) {
                try {
                    const refreshed = await refreshGoogleAccessToken(refreshToken);
                    accessToken = refreshed.accessToken;

                    await calendarDocRef.set(
                        {
                            google: {
                                accessToken,
                                expiryDate: refreshed.expiresIn
                                    ? Date.now() + refreshed.expiresIn * 1000
                                    : googleData.expiryDate || null,
                                updatedAt: new Date().toISOString(),
                            },
                            updatedAt: new Date().toISOString(),
                        },
                        { merge: true }
                    );

                    const photosAfterRefresh = await fetchGooglePhotos(accessToken, pageSize);
                    if (photosAfterRefresh.length > 0) {
                        return NextResponse.json({ success: true, source: 'photos', items: photosAfterRefresh });
                    }
                } catch (refreshError) {
                    console.warn('[admin/google/gallery] Refresh token failed:', refreshError);
                }
            }
        }
    }

    try {
        const driveItems = await fetchPublicDrive(pageSize);
        return NextResponse.json({ success: true, source: 'drive', items: driveItems });
    } catch (driveError: any) {
        return NextResponse.json(
            {
                success: false,
                message: driveError?.message || 'Falha ao carregar galeria Google',
            },
            { status: 500 }
        );
    }
}

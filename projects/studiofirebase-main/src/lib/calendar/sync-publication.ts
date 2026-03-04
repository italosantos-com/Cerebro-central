import { getAdminDb } from '@/lib/firebase-admin';
import { createGoogleCalendarEvent, type GoogleCalendarTokens } from '@/lib/calendar/google-calendar';
import { createAppleCalendarEvent } from '@/lib/calendar/apple-calendar';

export type CalendarSyncResult = {
  google?: {
    success: boolean;
    eventId?: string | null;
    calendarId?: string | null;
    error?: string;
  };
  apple?: {
    success: boolean;
    eventUrl?: string | null;
    calendarUrl?: string | null;
    error?: string;
  };
};

export async function syncPublicationToCalendars(params: {
  adminUid: string;
  title: string;
  publishAt: string | Date;
  url: string;
  type: 'photo' | 'video';
}) {
  const adminDb = getAdminDb();
  if (!adminDb) {
    return { error: 'Firestore Admin não configurado' };
  }

  const docRef = adminDb.collection('admins').doc(params.adminUid).collection('integrations').doc('calendar');
  const snapshot = await docRef.get();
  const data = snapshot.exists ? snapshot.data() || {} : {};

  const syncEnabled = Boolean(data.syncEnabled);
  if (!syncEnabled) {
    return { skipped: true, reason: 'sync-disabled' };
  }

  const publishDate = params.publishAt instanceof Date
    ? params.publishAt
    : new Date(params.publishAt);

  const endDate = new Date(publishDate.getTime() + 30 * 60 * 1000);

  const summary = `Publicação agendada: ${params.title}`;
  const description = `Tipo: ${params.type}\nURL: ${params.url}`;

  const result: CalendarSyncResult = {};

  if (data.google?.connected && data.google?.refreshToken) {
    try {
      const googleTokens: GoogleCalendarTokens = {
        accessToken: data.google?.accessToken,
        refreshToken: data.google?.refreshToken,
        expiryDate: data.google?.expiryDate
      };

      const googleResponse = await createGoogleCalendarEvent({
        tokens: googleTokens,
        calendarId: data.google?.calendarId || 'primary',
        summary,
        description,
        start: publishDate,
        end: endDate
      });

      result.google = {
        success: true,
        eventId: googleResponse.event?.id || null,
        calendarId: data.google?.calendarId || 'primary'
      };

      await docRef.set(
        {
          google: {
            ...data.google,
            accessToken: googleResponse.tokens.accessToken,
            refreshToken: googleResponse.tokens.refreshToken,
            expiryDate: googleResponse.tokens.expiryDate,
            updatedAt: new Date().toISOString()
          },
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
    } catch (error) {
      result.google = {
        success: false,
        error: error instanceof Error ? error.message : 'Falha ao sincronizar Google Calendar'
      };
    }
  }

  if (data.apple?.connected && data.apple?.username && data.apple?.appPassword) {
    try {
      const appleResponse = await createAppleCalendarEvent({
        username: data.apple.username,
        appPassword: data.apple.appPassword,
        calendarUrl: data.apple.calendarUrl,
        summary,
        description,
        start: publishDate,
        end: endDate,
        url: params.url
      });

      result.apple = {
        success: true,
        eventUrl: appleResponse.eventUrl || null,
        calendarUrl: appleResponse.calendarUrl || null
      };
    } catch (error) {
      result.apple = {
        success: false,
        error: error instanceof Error ? error.message : 'Falha ao sincronizar Apple Calendar'
      };
    }
  }

  return result;
}

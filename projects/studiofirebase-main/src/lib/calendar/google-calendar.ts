import { google } from 'googleapis';
import { getBaseUrl } from '@/lib/utils';

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/photoslibrary.readonly',
  'https://www.googleapis.com/auth/drive.readonly'
];

export type GoogleCalendarTokens = {
  accessToken?: string | null;
  refreshToken?: string | null;
  expiryDate?: number | null;
};

function resolveRedirectUri() {
  return (
    process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
    `${getBaseUrl()}/api/admin/calendar/google/callback`
  );
}

function getGoogleOAuthClient(redirectUri?: string) {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const resolvedRedirect = redirectUri || resolveRedirectUri();

  if (!clientId || !clientSecret) {
    throw new Error('Credenciais do Google Calendar não configuradas');
  }

  return new google.auth.OAuth2(clientId, clientSecret, resolvedRedirect);
}

export function getGoogleCalendarAuthUrl(state: string, redirectUri?: string) {
  const oauth2Client = getGoogleOAuthClient(redirectUri);

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: GOOGLE_SCOPES,
    state
  });
}

export async function exchangeGoogleCalendarCode(code: string, redirectUri?: string) {
  const oauth2Client = getGoogleOAuthClient(redirectUri);
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function createGoogleCalendarEvent(params: {
  tokens: GoogleCalendarTokens;
  calendarId?: string;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
}) {
  const { tokens, calendarId = 'primary', summary, description, start, end } = params;

  const oauth2Client = getGoogleOAuthClient();
  oauth2Client.setCredentials({
    access_token: tokens.accessToken || undefined,
    refresh_token: tokens.refreshToken || undefined,
    expiry_date: tokens.expiryDate || undefined
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const timeZone = process.env.CALENDAR_DEFAULT_TIMEZONE || 'America/Sao_Paulo';

  const response = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary,
      description,
      start: {
        dateTime: start.toISOString(),
        timeZone
      },
      end: {
        dateTime: end.toISOString(),
        timeZone
      }
    }
  });

  const updatedTokens = oauth2Client.credentials;

  return {
    event: response.data,
    tokens: {
      accessToken: updatedTokens.access_token,
      refreshToken: updatedTokens.refresh_token || tokens.refreshToken,
      expiryDate: updatedTokens.expiry_date
    }
  };
}

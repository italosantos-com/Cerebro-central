import { createDAVClient } from 'tsdav';
import crypto from 'crypto';

const ICLOUD_CALDAV_URL = 'https://caldav.icloud.com';

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function formatIcsDate(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

export function buildIcsEvent(params: {
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  url?: string;
}) {
  const uid = crypto.randomUUID();
  const dtStamp = formatIcsDate(new Date());
  const dtStart = formatIcsDate(params.start);
  const dtEnd = formatIcsDate(params.end);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Italo Santos Studio//Calendar//PT-BR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(params.summary)}`
  ];

  if (params.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(params.description)}`);
  }

  if (params.url) {
    lines.push(`URL:${escapeIcsText(params.url)}`);
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');

  return lines.join('\r\n');
}

export async function createAppleCalendarEvent(params: {
  username: string;
  appPassword: string;
  calendarUrl?: string | null;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  url?: string;
}) {
  const client = await createDAVClient({
    serverUrl: ICLOUD_CALDAV_URL,
    credentials: {
      username: params.username,
      password: params.appPassword
    },
    authMethod: 'Basic',
    defaultAccountType: 'caldav'
  });

  const calendars = await client.fetchCalendars();
  const targetCalendar = params.calendarUrl
    ? calendars.find((calendar) => calendar.url === params.calendarUrl)
    : calendars[0];

  if (!targetCalendar) {
    throw new Error('Calendário da Apple não encontrado');
  }

  const ics = buildIcsEvent({
    summary: params.summary,
    description: params.description,
    start: params.start,
    end: params.end,
    url: params.url
  });

  const filename = `publication-${crypto.randomUUID()}.ics`;
  const created = await client.createCalendarObject({
    calendar: targetCalendar,
    filename,
    iCalString: ics
  });

  return {
    calendarUrl: targetCalendar.url,
    calendarName: targetCalendar.displayName,
    eventUrl: created?.url || `${targetCalendar.url}${filename}`
  };
}

export async function verifyAppleCalendarConnection(params: {
  username: string;
  appPassword: string;
  calendarUrl?: string | null;
}) {
  const client = await createDAVClient({
    serverUrl: ICLOUD_CALDAV_URL,
    credentials: {
      username: params.username,
      password: params.appPassword
    },
    authMethod: 'Basic',
    defaultAccountType: 'caldav'
  });

  const calendars = await client.fetchCalendars();
  const targetCalendar = params.calendarUrl
    ? calendars.find((calendar) => calendar.url === params.calendarUrl)
    : calendars[0];

  if (!targetCalendar) {
    throw new Error('Calendário da Apple não encontrado');
  }

  return {
    calendarUrl: targetCalendar.url,
    calendarName: targetCalendar.displayName
  };
}

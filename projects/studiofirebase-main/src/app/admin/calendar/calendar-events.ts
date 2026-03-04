export type AdminCalendarEventType = 'publication' | 'message' | 'subscription-expiration' | 'custom';

export type CalendarSyncTarget = 'both' | 'google' | 'apple' | 'none';

export interface AdminCalendarEvent {
  id: string;
  title: string;
  type: AdminCalendarEventType;
  scheduledAt: string;
  syncTarget: CalendarSyncTarget;
}

export const CALENDAR_EVENT_LABELS: Record<AdminCalendarEventType, string> = {
  publication: 'Publicação agendada',
  message: 'Envio de mensagem',
  'subscription-expiration': 'Notificação de expiração',
  custom: 'Lembrete personalizado'
};

export function toDateKey(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createQuickCalendarEvent(params: {
  date: Date;
  type: AdminCalendarEventType;
  title?: string;
  syncTarget?: CalendarSyncTarget;
  hour?: number;
  minute?: number;
}): Omit<AdminCalendarEvent, 'id'> {
  const scheduledAt = new Date(params.date);
  scheduledAt.setHours(params.hour ?? 10, params.minute ?? 0, 0, 0);

  return {
    title: params.title?.trim() || CALENDAR_EVENT_LABELS[params.type],
    type: params.type,
    scheduledAt: scheduledAt.toISOString(),
    syncTarget: params.syncTarget || 'both'
  };
}

export function getEventsForDate(events: AdminCalendarEvent[], date: Date): AdminCalendarEvent[] {
  const key = toDateKey(date);
  return events.filter((event) => toDateKey(event.scheduledAt) === key);
}

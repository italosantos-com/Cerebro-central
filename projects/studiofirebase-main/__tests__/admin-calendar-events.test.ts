import { createQuickCalendarEvent, getEventsForDate, toDateKey } from '@/app/admin/calendar/calendar-events';

describe('calendar-events utils', () => {
  it('cria evento rápido padrão para publicação com sincronização Apple + Google', () => {
    const event = createQuickCalendarEvent({
      date: new Date('2026-03-10T15:00:00.000Z'),
      type: 'publication'
    });

    expect(event.title).toBe('Publicação agendada');
    expect(event.syncTarget).toBe('both');
    expect(toDateKey(event.scheduledAt)).toBe('2026-03-10');
  });

  it('usa rótulo de notificação para expiração de assinatura', () => {
    const event = createQuickCalendarEvent({
      date: new Date('2026-03-10T15:00:00.000Z'),
      type: 'subscription-expiration'
    });

    expect(event.title).toBe('Notificação de expiração');
  });

  it('filtra eventos da data selecionada', () => {
    const events = [
      { id: '1', ...createQuickCalendarEvent({ date: new Date('2026-03-10T10:00:00.000Z'), type: 'message' }) },
      { id: '2', ...createQuickCalendarEvent({ date: new Date('2026-03-11T10:00:00.000Z'), type: 'custom', title: 'Outro' }) }
    ];

    const result = getEventsForDate(events, new Date('2026-03-10T18:00:00.000Z'));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });
});

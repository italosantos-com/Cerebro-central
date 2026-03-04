
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AdminCalendarEvent,
  AdminCalendarEventType,
  CalendarSyncTarget,
  createQuickCalendarEvent,
  getEventsForDate,
  toDateKey
} from '@/app/admin/calendar/calendar-events';

export default function AdminCalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<AdminCalendarEvent[]>([]);
  const [title, setTitle] = useState('');
  const [syncTarget, setSyncTarget] = useState<CalendarSyncTarget>('both');
  const selectedDate = date || new Date();
  const selectedDateEvents = getEventsForDate(events, selectedDate);
  const eventDates = Array.from(new Set(events.map((event) => toDateKey(event.scheduledAt))));
  const parseDateKey = (key: string) => {
    const [year, month, day] = key.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const addQuickEvent = (type: AdminCalendarEventType) => {
    const nextEvent = createQuickCalendarEvent({
      date: selectedDate,
      type,
      title: type === 'custom' ? title : undefined,
      syncTarget
    });

    setEvents((previous) => [
      ...previous,
      {
        ...nextEvent,
        id: globalThis.crypto?.randomUUID?.() || `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`
      }
    ]);
    if (type === 'custom') {
      setTitle('');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-xl bg-black/90 border border-white/10 p-4 backdrop-blur-sm">
        <h1 className="text-3xl font-bold text-white">Calendário</h1>
        <p className="text-white/60">
          Organize publicações, mensagens e lembretes com sincronização Apple e Google Calendar.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" asChild>
          <Link href="/admin/integrations">Configurar Apple/Google Calendar</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/cerebro-central-ia">Abrir automações no Cérebro Central</Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(320px,440px)_1fr]">
        <Card className="p-4">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="rounded-md"
            modifiers={{
              scheduled: eventDates.map(parseDateKey)
            }}
            modifiersClassNames={{
              scheduled: 'bg-emerald-100 text-emerald-900 rounded-md'
            }}
          />
        </Card>

        <Card className="p-4 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Agendamentos para {selectedDate.toLocaleDateString('pt-BR')}</h2>
            <p className="text-sm text-muted-foreground">
              Atalhos para recursos estilo Apple/Google Calendar: publicação, mensagem e notificação de expiração.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="secondary" onClick={() => addQuickEvent('publication')}>Agendar publicação</Button>
            <Button variant="secondary" onClick={() => addQuickEvent('message')}>Agendar envio de mensagem</Button>
            <Button variant="secondary" onClick={() => addQuickEvent('subscription-expiration')}>Notificar expiração</Button>
          </div>

          <div className="space-y-2">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Novo lembrete personalizado"
            />
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={syncTarget}
                onChange={(event) => setSyncTarget(event.target.value as CalendarSyncTarget)}
              >
                <option value="both">Sincronizar: Apple + Google</option>
                <option value="google">Sincronizar: Google</option>
                <option value="apple">Sincronizar: Apple</option>
                <option value="none">Não sincronizar</option>
              </select>
              <Button onClick={() => addQuickEvent('custom')}>Adicionar lembrete</Button>
            </div>
          </div>

          <div className="space-y-2">
            {selectedDateEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum agendamento para este dia.</p>
            ) : (
              selectedDateEvents.map((event) => (
                <div key={event.id} className="rounded-md border p-3 text-sm">
                  <p className="font-medium">{event.title}</p>
                  <p className="text-muted-foreground">
                    {new Date(event.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    {' • '}
                    {event.syncTarget === 'both'
                      ? 'Apple + Google'
                      : event.syncTarget === 'none'
                        ? 'Sem sincronização'
                        : event.syncTarget === 'google'
                          ? 'Google'
                          : 'Apple'}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

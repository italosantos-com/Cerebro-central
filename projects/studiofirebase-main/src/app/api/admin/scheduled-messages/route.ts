import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { extractAdminUidFromRequest } from '@/lib/admin-api-middleware';
import { Timestamp } from 'firebase-admin/firestore';

function parseDateTime(date: string, time: string) {
  const [day, month, year] = date.split('/').map((value) => Number(value));
  const [hour, minute] = time.split(':').map((value) => Number(value));

  if (!day || !month || !year || Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }

  const parsed = new Date(year, month - 1, day, hour, minute, 0, 0);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export async function POST(request: NextRequest) {
  try {
    const { adminUid, error: authError } = await extractAdminUidFromRequest(request);

    if (!adminUid) {
      return NextResponse.json(
        { error: authError || 'Não autenticado', success: false },
        { status: 401 }
      );
    }

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json(
        { error: 'Firebase DB não inicializado', success: false },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { date, time, message, audience } = body || {};

    if (!date || !time || !message) {
      return NextResponse.json(
        { error: 'Data, hora e mensagem são obrigatórias', success: false },
        { status: 400 }
      );
    }

    if (typeof message !== 'string' || message.trim().length < 2) {
      return NextResponse.json(
        { error: 'Mensagem inválida', success: false },
        { status: 400 }
      );
    }

    const scheduledAt = parseDateTime(date, time);
    if (!scheduledAt) {
      return NextResponse.json(
        { error: 'Data ou hora inválida', success: false },
        { status: 400 }
      );
    }

    const scheduleDoc = {
      audience: audience === 'admins' ? 'admins' : 'admins',
      message: message.trim(),
      status: 'pending',
      scheduledAt: Timestamp.fromDate(scheduledAt),
      createdAt: Timestamp.now(),
      createdBy: adminUid,
      source: 'central-assistant'
    };

    const docRef = await db.collection('scheduled_messages').add(scheduleDoc);

    return NextResponse.json({ success: true, id: docRef.id });
  } catch (error) {
    console.error('[Scheduled Messages API] Erro no POST:', error);
    return NextResponse.json(
      { error: 'Erro ao criar agendamento', success: false },
      { status: 500 }
    );
  }
}

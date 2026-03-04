import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminDb } from '@/lib/firebase-admin';
import { getDatabase } from 'firebase-admin/database';
import { centralAssistantBrain } from '@/lib/central-assistant';

type ConversationSettings = {
  autoReplyEnabled: boolean;
  replyTone: 'humanized' | 'robotic';
};

const DEFAULT_SETTINGS: ConversationSettings = {
  autoReplyEnabled: false,
  replyTone: 'humanized',
};

function isValidSecretChatId(value: string) {
  return /^secret-chat-(?:[a-z0-9_-]{1,40}-)?[a-z0-9]{1,24}$/i.test(value);
}

async function getConversationSettings(adminUid: string): Promise<ConversationSettings> {
  try {
    const adminApp = getAdminApp();
    if (!adminApp) return DEFAULT_SETTINGS;
    const rtdb = getDatabase(adminApp);
    const snap = await rtdb.ref(`admin/conversationSettings/${adminUid}`).get();
    const val = snap.val();
    if (!val || typeof val !== 'object') return DEFAULT_SETTINGS;
    return {
      autoReplyEnabled: Boolean((val as any).autoReplyEnabled),
      replyTone: (val as any).replyTone === 'robotic' ? 'robotic' : 'humanized',
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const chatId = String(body?.chatId || '');
  const text = String(body?.text || '').trim();

  if (!chatId || !isValidSecretChatId(chatId)) {
    return NextResponse.json({ success: false, message: 'chatId inválido' }, { status: 400 });
  }

  if (!text) {
    return NextResponse.json({ success: true, skipped: true, reason: 'empty-text' });
  }

  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json({ success: false, message: 'Firebase Admin não inicializado' }, { status: 500 });
  }

  const chatRef = adminDb.collection('chats').doc(chatId);
  const chatSnap = await chatRef.get();
  const chatData = chatSnap.exists ? (chatSnap.data() || {}) : {};
  const adminUid = typeof (chatData as any).adminUid === 'string' ? (chatData as any).adminUid : null;

  if (!adminUid) {
    return NextResponse.json({ success: true, skipped: true, reason: 'no-adminUid' });
  }

  const settings = await getConversationSettings(adminUid);
  if (!settings.autoReplyEnabled) {
    return NextResponse.json({ success: true, skipped: true, reason: 'disabled' });
  }

  const clipped = text.slice(0, 800);
  const styleInstruction = settings.replyTone === 'robotic'
    ? 'Responda de forma robótica: direta, objetiva, sem emojis, sem floreios. Máx. 2-4 frases.'
    : 'Responda de forma humanizada: cordial, natural e acolhedora, como uma pessoa real. Máx. 2-4 frases.';

  let aiResponseText: string;
  try {
    aiResponseText = await centralAssistantBrain.run({
      question: `${styleInstruction}\n\nMensagem do usuário:\n${clipped}`,
      userId: adminUid,
      context: {
        channel: 'site',
        chatId,
      },
    });
  } catch (error) {
    console.error('[SecretChat][AutoReply] Erro ao gerar resposta:', error);
    return NextResponse.json({ success: false, message: 'Falha ao gerar resposta' }, { status: 500 });
  }

  const replyText = String(aiResponseText || '').trim();
  if (!replyText) {
    return NextResponse.json({ success: true, skipped: true, reason: 'empty-ai' });
  }

  const messageData = {
    text: replyText,
    senderId: 'admin',
    recipientId: null,
    timestamp: new Date(),
    read: false,
    isAiResponse: true,
  };

  await chatRef.collection('messages').add(messageData);

  await chatRef.set({
    lastMessage: {
      text: replyText,
      senderId: 'admin',
      timestamp: new Date(),
    },
    updatedAt: new Date(),
  }, { merge: true });

  return NextResponse.json({ success: true, replied: true });
}

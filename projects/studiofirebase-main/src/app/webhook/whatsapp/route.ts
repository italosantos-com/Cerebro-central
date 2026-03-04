import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getDatabase } from 'firebase-admin/database';
import {
  getChannelMessageByExternalId,
  mergeChannelMessageMetadata,
  saveChannelMessage,
} from '@/lib/channel-messages';
import {
  handleJasperMessage,
  handleJasperStatus,
  isJasperDemoEnabled,
} from '@/services/whatsapp-jasper-bot';

type ConversationSettings = {
  autoReplyEnabled: boolean;
  replyTone: 'humanized' | 'robotic';
};

const DEFAULT_CONVERSATION_SETTINGS: ConversationSettings = {
  autoReplyEnabled: false,
  replyTone: 'humanized',
};

function getVerificationToken() {
  return process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN || '';
}

async function resolveAdminUidByPhoneNumberId(phoneNumberId: string) {
  const adminApp = getAdminApp();
  if (!adminApp) return null;
  const db = getDatabase(adminApp);
  const snapshot = await db.ref('admin/integrations').get();
  const integrations = snapshot.val() || {};

  for (const [uid, platforms] of Object.entries<any>(integrations)) {
    const whatsapp = platforms?.whatsapp;
    if (whatsapp?.phone_number_id === phoneNumberId || whatsapp?.user_id === phoneNumberId) {
      return uid;
    }
  }
  return null;
}

async function getConversationSettings(rtdb: ReturnType<typeof getDatabase>, adminUid: string): Promise<ConversationSettings> {
  try {
    const snap = await rtdb.ref(`admin/conversationSettings/${adminUid}`).get();
    const val = snap.val();
    if (!val || typeof val !== 'object') return DEFAULT_CONVERSATION_SETTINGS;
    return {
      autoReplyEnabled: Boolean((val as any).autoReplyEnabled),
      replyTone: (val as any).replyTone === 'robotic' ? 'robotic' : 'humanized',
    };
  } catch {
    return DEFAULT_CONVERSATION_SETTINGS;
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token && token === getVerificationToken()) {
    return new NextResponse(challenge || '', { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const entries = body?.entry || [];

  const adminApp = getAdminApp();
  const rtdb = adminApp ? getDatabase(adminApp) : null;
  const settingsCache = new Map<string, ConversationSettings>();

  for (const entry of entries) {
    const changes = entry?.changes || [];
    for (const change of changes) {
      const value = change?.value;
      const metadata = value?.metadata;
      const phoneNumberId = metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      const adminUid = await resolveAdminUidByPhoneNumberId(phoneNumberId);
      if (!adminUid) continue;

      let conversationSettings = settingsCache.get(adminUid) || null;
      if (!conversationSettings) {
        conversationSettings = rtdb ? await getConversationSettings(rtdb, adminUid) : DEFAULT_CONVERSATION_SETTINGS;
        settingsCache.set(adminUid, conversationSettings);
      }

      const messages = value?.messages || [];
      for (const msg of messages) {
        const senderId = msg?.from;
        const interactiveId = msg?.interactive?.button_reply?.id;
        const interactiveTitle = msg?.interactive?.button_reply?.title;
        const text = msg?.text?.body || interactiveTitle || '';

        if (!senderId || !text) continue;

        await saveChannelMessage({
          adminUid,
          channel: 'whatsapp',
          externalId: msg?.id || null,
          sender: senderId,
          recipient: phoneNumberId,
          conversationId: senderId,
          text,
          read: false,
          metadata: {
            ...msg,
            interactiveId,
            interactiveTitle,
          },
        });

        if (isJasperDemoEnabled() && conversationSettings.autoReplyEnabled) {
          try {
            const result = await handleJasperMessage({
              phoneNumberId,
              sender: senderId,
              messageId: msg?.id,
              text,
              type: msg?.type,
              interactiveId,
              interactiveTitle,
            }, conversationSettings.replyTone);

            const outboundId = result.response?.messages?.[0]?.id || null;
            if (outboundId) {
              await saveChannelMessage({
                adminUid,
                channel: 'whatsapp',
                externalId: outboundId,
                sender: 'bot',
                recipient: senderId,
                conversationId: senderId,
                text: result.sentText || result.templateName || null,
                read: true,
                metadata: {
                  provider: result.response as any,
                  jasper: {
                    type: result.responseType,
                    templateName: result.templateName,
                    followUp: !!result.shouldFollowUp,
                    followUpSent: false,
                  },
                },
              });
            }
          } catch (error) {
            console.error('[WhatsApp][Jasper] Erro ao responder:', error);
          }
        }
      }

      const statuses = value?.statuses || [];
      for (const status of statuses) {
        if (!isJasperDemoEnabled() || !conversationSettings.autoReplyEnabled) continue;

        const statusId = status?.id;
        if (!statusId) continue;

        const existing = await getChannelMessageByExternalId({
          adminUid,
          channel: 'whatsapp',
          sender: 'bot',
          externalId: statusId,
        });

        const jasperMeta: any = existing.exists && existing?.metadata && typeof existing.metadata === 'object'
          ? (existing.metadata as any).jasper
          : null;

        const shouldFollowUp = jasperMeta?.followUp && !jasperMeta?.followUpSent;
        if (!shouldFollowUp) continue;

        try {
          const { response, sentText } = await handleJasperStatus({
            phoneNumberId,
            status: status?.status,
            messageId: statusId,
            recipient: status?.recipient_id,
          }, conversationSettings.replyTone);

          const followUpId = response?.messages?.[0]?.id || null;
          if (followUpId) {
            await saveChannelMessage({
              adminUid,
              channel: 'whatsapp',
              externalId: followUpId,
              sender: 'bot',
              recipient: status?.recipient_id || null,
              conversationId: status?.recipient_id || 'unknown',
              text: sentText || null,
              read: true,
              metadata: {
                provider: response as any,
                jasper: {
                  type: 'follow-up',
                },
              },
            });
          }

          if (existing.exists) {
            await mergeChannelMessageMetadata({
              adminUid,
              channel: 'whatsapp',
              sender: 'bot',
              externalId: statusId,
              mutate: (currentMeta) => ({
                ...(currentMeta as any),
                jasper: {
                  ...(jasperMeta as any),
                  followUpSent: true,
                },
              }),
            });
          }
        } catch (error) {
          console.error('[WhatsApp][Jasper] Erro no follow-up:', error);
        }
      }

      const echoes = value?.message_echoes || [];
      for (const echo of echoes) {
        const senderId = echo?.from;
        const recipientId = echo?.to;
        const text = echo?.text?.body || '';

        if (!senderId || !recipientId || !text) continue;

        await saveChannelMessage({
          adminUid,
          channel: 'whatsapp',
          externalId: echo?.id || null,
          sender: senderId,
          recipient: recipientId,
          conversationId: recipientId,
          text,
          read: true,
          metadata: {
            ...echo,
            source: 'smb_message_echoes',
          },
        });
      }
    }
  }

  return NextResponse.json({ success: true });
}

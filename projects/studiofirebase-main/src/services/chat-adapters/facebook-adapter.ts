/**
 * Facebook Chat Adapter
 *
 * Gerencia mensagens do Facebook Messenger usando o storage no Firestore.
 */

import { BaseChatAdapter } from './base-adapter';
import { UnifiedMessage, UnifiedConversation, ChatOperationResult } from '@/types/chat';
import { CHAT_CHANNELS, SENDER_TYPES, MESSAGE_STATUS, CONTENT_TYPES, type MessageStatus } from '@/lib/chat-constants';
import { getAdminApp, getAdminDb } from '@/lib/firebase-admin';
import { getDatabase } from 'firebase-admin/database';
import { getChannelMessagesCollection, saveChannelMessage } from '@/lib/channel-messages';

const FACEBOOK_API_VERSION = 'v19.0';

type FacebookIntegrationData = {
  connected?: boolean;
  access_token?: string;
  page_id?: string | null;
  user_id?: string | null;
};

export class FacebookAdapter extends BaseChatAdapter {
  readonly channel = CHAT_CHANNELS.FACEBOOK;

  private getMessagesCollection(adminUid: string) {
    return getChannelMessagesCollection(adminUid, CHAT_CHANNELS.FACEBOOK);
  }

  private toDate(value: any): Date {
    if (!value) return new Date();
    if (value instanceof Date) return value;
    if (typeof value?.toDate === 'function') return value.toDate();
    if (typeof value === 'string' || typeof value === 'number') return new Date(value);
    return new Date();
  }

  private async getIntegrationData(adminUid: string): Promise<FacebookIntegrationData | null> {
    const adminApp = getAdminApp();
    if (!adminApp) return null;

    const db = getDatabase(adminApp);
    const perAdminSnap = await db.ref(`admin/integrations/${adminUid}/facebook`).get();
    const perAdmin = perAdminSnap?.val();

    if (perAdmin && typeof perAdmin === 'object') {
      return perAdmin as FacebookIntegrationData;
    }

    const globalSnap = await db.ref('admin/integrations/facebook').get();
    const globalData = globalSnap?.val();
    if (globalData && typeof globalData === 'object') {
      return globalData as FacebookIntegrationData;
    }

    return null;
  }

  async isConfigured(): Promise<boolean> {
    return true;
  }

  async fetchConversations(adminUid: string): Promise<UnifiedConversation[]> {
    try {
      const col = this.getMessagesCollection(adminUid);
      const snapshot = await col.orderBy('timestamp', 'desc').limit(200).get();
      const messages = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) }));

      const conversationMap = new Map<string, any[]>();

      for (const msg of messages) {
        const meta = (msg.metadata ?? {}) as any;
        const metaConversationId = typeof meta === 'object' ? (meta.conversationId as string | undefined) : undefined;

        const isOutgoing = msg.sender === SENDER_TYPES.ADMIN || msg.sender === 'admin';
        const conversationId =
          msg.conversationId ||
          metaConversationId ||
          msg.recipient ||
          (!isOutgoing ? msg.sender : undefined) ||
          'unknown';

        if (!conversationMap.has(conversationId)) {
          conversationMap.set(conversationId, []);
        }
        conversationMap.get(conversationId)!.push(msg);
      }

      const conversations: UnifiedConversation[] = [];

      for (const [participantId, msgs] of conversationMap.entries()) {
        const sortedMsgs = msgs.sort((a, b) =>
          this.toDate(b.timestamp).getTime() - this.toDate(a.timestamp).getTime()
        );

        const lastMsg = sortedMsgs[0];
        const unreadCount = sortedMsgs.filter((m) => {
          const isOutgoing = m.sender === SENDER_TYPES.ADMIN || m.sender === 'admin';
          return !m.read && !isOutgoing;
        }).length;

        const lastMessage = this.convertToUnifiedMessage(lastMsg, adminUid);

        conversations.push({
          id: participantId,
          channel: CHAT_CHANNELS.FACEBOOK,
          participant: {
            id: participantId,
            name: participantId,
            type: SENDER_TYPES.USER
          },
          lastMessage,
          unreadCount,
          adminUid,
          archived: false,
          muted: false,
          starred: false,
          status: 'active',
          createdAt: this.toDate(sortedMsgs[sortedMsgs.length - 1]?.timestamp).toISOString(),
          updatedAt: this.toDate(lastMsg.timestamp).toISOString()
        });
      }

      return conversations.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    } catch (error) {
      console.error('[FacebookAdapter] Erro ao buscar conversas:', error);
      return [];
    }
  }

  async fetchMessages(conversationId: string, adminUid: string, limit: number = 100): Promise<UnifiedMessage[]> {
    try {
      const col = this.getMessagesCollection(adminUid);
      const batchSize = Math.max(limit * 10, 500);
      const snapshot = await col.orderBy('timestamp', 'desc').limit(batchSize).get();
      const messages = snapshot.docs
        .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
        .filter((msg) => {
          const isOutgoing = msg.sender === SENDER_TYPES.ADMIN || msg.sender === 'admin';
          const msgConversationId =
            msg.conversationId ||
            msg.recipient ||
            (!isOutgoing ? msg.sender : undefined) ||
            'unknown';
          return msgConversationId === conversationId;
        })
        .sort((a, b) => this.toDate(a.timestamp).getTime() - this.toDate(b.timestamp).getTime())
        .slice(-limit);

      return messages.map((msg) => this.convertToUnifiedMessage(msg, adminUid));
    } catch (error) {
      console.error('[FacebookAdapter] Erro ao buscar mensagens:', error);
      throw error;
    }
  }

  async sendMessage(
    conversationId: string,
    recipientId: string,
    text: string,
    adminUid: string
  ): Promise<ChatOperationResult<UnifiedMessage>> {
    try {
      const integration = await this.getIntegrationData(adminUid);
      const accessToken = integration?.access_token;

      if (!accessToken) {
        return this.createErrorResult(
          'FACEBOOK_NOT_CONFIGURED',
          'Access token do Facebook não encontrado'
        );
      }

      const targetPageId =
        integration?.page_id ||
        integration?.user_id ||
        recipientId ||
        conversationId;

      const response = await fetch(`https://graph.facebook.com/${FACEBOOK_API_VERSION}/${targetPageId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          messaging_type: 'RESPONSE',
          recipient: { id: recipientId || conversationId },
          message: { text }
        })
      });

      const data = await response.json();
      if (!response.ok) {
        return this.createErrorResult(
          'FACEBOOK_SEND_FAILED',
          data?.error?.message || 'Falha ao enviar mensagem no Messenger',
          data
        );
      }

      const created = await saveChannelMessage({
        adminUid,
        channel: 'facebook',
        externalId: data?.message_id || null,
        sender: SENDER_TYPES.ADMIN,
        recipient: recipientId || conversationId,
        conversationId: recipientId || conversationId,
        text,
        read: true,
        metadata: data
      });

      return this.createSuccessResult(this.convertToUnifiedMessage(created, adminUid));
    } catch (error) {
      return this.createErrorResult(
        'SEND_MESSAGE_FAILED',
        error instanceof Error ? error.message : 'Erro ao enviar mensagem',
        error
      );
    }
  }

  async markAsRead(messageIds: string[], adminUid: string): Promise<ChatOperationResult<void>> {
    try {
      const col = this.getMessagesCollection(adminUid);
      const db = getAdminDb();
      if (!db) throw new Error('Firebase Admin não inicializado (Firestore indisponível).');

      const batch = db.batch();
      for (const id of messageIds) {
        batch.set(col.doc(id), { read: true }, { merge: true });
      }
      await batch.commit();

      return this.createSuccessResult(undefined);
    } catch (error) {
      return this.createErrorResult(
        'MARK_READ_FAILED',
        error instanceof Error ? error.message : 'Erro ao marcar como lida',
        error
      );
    }
  }

  private convertToUnifiedMessage(data: any, adminUid: string): UnifiedMessage {
    const meta = (data.metadata ?? {}) as any;
    const metaConversationId = typeof meta === 'object' ? (meta.conversationId as string | undefined) : undefined;
    const isOutgoing = data.sender === SENDER_TYPES.ADMIN || data.sender === 'admin';
    const conversationId = metaConversationId || data.recipient || (!isOutgoing ? data.sender : undefined) || '';

    const ts = data.timestamp ?? data.createdAt ?? new Date();
    const status = this.mapStatus(meta?.status ?? (data.read ? 'read' : 'sent'));

    return {
      id: data.id,
      channel: CHAT_CHANNELS.FACEBOOK,
      conversationId,
      sender: {
        id: isOutgoing ? adminUid : (conversationId || 'user'),
        name: isOutgoing ? 'Admin' : (conversationId || 'Contato'),
        type: isOutgoing ? SENDER_TYPES.ADMIN : SENDER_TYPES.USER
      },
      recipient: {
        id: isOutgoing ? (conversationId || 'user') : adminUid,
        name: isOutgoing ? (conversationId || 'Contato') : 'Admin',
        type: isOutgoing ? SENDER_TYPES.USER : SENDER_TYPES.ADMIN
      },
      content: {
        type: CONTENT_TYPES.TEXT,
        text: data.text || ''
      },
      status,
      timestamp: new Date(ts).toISOString(),
      read: Boolean(data.read),
      readAt: data.read ? (data.updatedAt?.toISOString?.() || undefined) : undefined,
      adminUid,
      metadata: {
        externalId: data.externalId,
        ...((typeof meta === 'object' && meta) ? meta : {})
      },
      createdAt: data.createdAt?.toISOString?.() || new Date(ts).toISOString(),
      updatedAt: data.updatedAt?.toISOString?.() || new Date(ts).toISOString()
    };
  }

  private mapStatus(status: string | null): MessageStatus {
    if (!status) return MESSAGE_STATUS.SENT;

    const statusMap: Record<string, MessageStatus> = {
      sent: MESSAGE_STATUS.SENT,
      delivered: MESSAGE_STATUS.DELIVERED,
      read: MESSAGE_STATUS.READ,
      failed: MESSAGE_STATUS.FAILED
    };

    return statusMap[status] || MESSAGE_STATUS.SENT;
  }
}

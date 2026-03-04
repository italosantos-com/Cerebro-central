/**
 * WhatsApp Chat Adapter
 * 
 * Gerencia mensagens do WhatsApp Business API
 * Usa Prisma/PostgreSQL como storage
 */

import { BaseChatAdapter } from './base-adapter';
import { UnifiedMessage, UnifiedConversation, ChatOperationResult } from '@/types/chat';
import { CHAT_CHANNELS, SENDER_TYPES, MESSAGE_STATUS, CONTENT_TYPES, type MessageStatus } from '@/lib/chat-constants';
import { getAdminDb } from '@/lib/firebase-admin';

export class WhatsAppAdapter extends BaseChatAdapter {
  readonly channel = CHAT_CHANNELS.WHATSAPP;

  private getMessagesCollection(adminUid: string) {
    const db = getAdminDb();
    if (!db) {
      throw new Error('Firebase Admin não inicializado (Firestore indisponível).');
    }

    return db
      .collection('admins')
      .doc(adminUid)
      .collection('channels')
      .doc(CHAT_CHANNELS.WHATSAPP)
      .collection('messages');
  }

  private toDate(value: any): Date {
    if (!value) return new Date();
    if (value instanceof Date) return value;
    if (typeof value?.toDate === 'function') return value.toDate();
    if (typeof value === 'string' || typeof value === 'number') return new Date(value);
    return new Date();
  }

  async isConfigured(): Promise<boolean> {
    // Verificar se as env vars estão presentes
    return Boolean(
      process.env.WHATSAPP_PHONE_NUMBER_ID &&
      process.env.WHATSAPP_BUSINESS_ACCOUNT_ID &&
      process.env.WHATSAPP_ACCESS_TOKEN
    );
  }

  async fetchConversations(adminUid: string): Promise<UnifiedConversation[]> {
    try {
      const col = this.getMessagesCollection(adminUid);
      const snapshot = await col.orderBy('timestamp', 'desc').limit(200).get();
      const messages = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) }));

      // Agrupar por conversationId (derivado de metadata/recipient/sender)
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

      // Converter para UnifiedConversation
      const conversations: UnifiedConversation[] = [];

      for (const [phoneNumber, msgs] of conversationMap.entries()) {
        const sortedMsgs = msgs.sort((a, b) => 
          this.toDate(b.timestamp).getTime() - this.toDate(a.timestamp).getTime()
        );
        
        const lastMsg = sortedMsgs[0];
        const unreadCount = sortedMsgs.filter(m => {
          const isOutgoing = m.sender === SENDER_TYPES.ADMIN || m.sender === 'admin';
          return !m.read && !isOutgoing;
        }).length;

        const lastMessage = this.convertToUnifiedMessage(lastMsg, adminUid);

        conversations.push({
          id: phoneNumber,
          channel: CHAT_CHANNELS.WHATSAPP,
          participant: {
            id: phoneNumber,
            name: phoneNumber,
            type: SENDER_TYPES.USER,
            phone: phoneNumber
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
      console.error('[WhatsAppAdapter] Erro ao buscar conversas:', error);
      return [];
    }
  }

  async fetchMessages(conversationId: string, adminUid: string, limit: number = 100): Promise<UnifiedMessage[]> {
    try {
      const col = this.getMessagesCollection(adminUid);
      // Evita índices compostos: pega um lote recente e filtra em memória.
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
      console.error('[WhatsAppAdapter] Erro ao buscar mensagens:', error);
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
      // Enviar via WhatsApp Business API
      const response = await this.sendWhatsAppMessage(conversationId, text);
      
      if (!response.success) {
        return this.createErrorResult(
          'WHATSAPP_SEND_FAILED',
          'Erro ao enviar mensagem pelo WhatsApp',
          response.error
        );
      }

      // Salvar no Firestore
      const col = this.getMessagesCollection(adminUid);
      const docData = {
        adminUid,
        channel: CHAT_CHANNELS.WHATSAPP,
        externalId: response.messageId || null,
        sender: SENDER_TYPES.ADMIN,
        recipient: recipientId || conversationId,
        conversationId: recipientId || conversationId,
        text: String(text),
        timestamp: new Date(),
        read: true,
        metadata: {
          conversationId: recipientId || conversationId,
          direction: 'outgoing',
          status: 'sent',
        },
      };

      let message: any;
      if (response.messageId) {
        const safeSender = String(SENDER_TYPES.ADMIN).replaceAll('/', '_').slice(0, 64);
        const safeExt = encodeURIComponent(String(response.messageId));
        const id = `${safeSender}_${safeExt}`;
        await col.doc(id).set(docData, { merge: true });
        message = { id, ...docData };
      } else {
        const ref = await col.add(docData);
        message = { id: ref.id, ...docData };
      }

      const unifiedMessage = this.convertToUnifiedMessage(message, adminUid);
      return this.createSuccessResult(unifiedMessage);
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

  private async sendWhatsAppMessage(phoneNumber: string, text: string): Promise<any> {
    try {
      const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
      const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

      if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
        return {
          success: false,
          error: 'WhatsApp não configurado'
        };
      }

      const url = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phoneNumber.replace(/\D/g, ''), // Apenas números
          type: 'text',
          text: { body: text }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData
        };
      }

      const data = await response.json();
      return {
        success: true,
        messageId: data.messages?.[0]?.id
      };
    } catch (error) {
      console.error('[WhatsAppAdapter] Erro ao enviar mensagem:', error);
      return {
        success: false,
        error
      };
    }
  }

  private convertToUnifiedMessage(data: any, adminUid: string): UnifiedMessage {
    const meta = (data.metadata ?? {}) as any;
    const metaConversationId = typeof meta === 'object' ? (meta.conversationId as string | undefined) : undefined;
    const isOutgoing = data.sender === SENDER_TYPES.ADMIN || data.sender === 'admin';
    const conversationId = metaConversationId || data.recipient || (!isOutgoing ? data.sender : undefined) || '';

    const mediaUrl = typeof meta === 'object' ? (meta.mediaUrl as string | undefined) : undefined;
    const rawStatus = typeof meta === 'object' ? (meta.status as string | undefined) : undefined;
    const status = this.mapStatus(rawStatus ?? (data.read ? 'read' : 'sent'));

    const ts = data.timestamp ?? data.createdAt ?? new Date();

    return {
      id: data.id,
      channel: CHAT_CHANNELS.WHATSAPP,
      conversationId,
      sender: {
        id: isOutgoing ? adminUid : (conversationId || 'user'),
        name: isOutgoing ? 'Admin' : (conversationId || 'Contato'),
        type: isOutgoing ? SENDER_TYPES.ADMIN : SENDER_TYPES.USER,
        phone: conversationId || undefined
      },
      recipient: {
        id: isOutgoing ? (conversationId || 'user') : adminUid,
        name: isOutgoing ? (conversationId || 'Contato') : 'Admin',
        type: isOutgoing ? SENDER_TYPES.USER : SENDER_TYPES.ADMIN,
        phone: isOutgoing ? (conversationId || undefined) : undefined
      },
      content: {
        type: mediaUrl ? CONTENT_TYPES.IMAGE : CONTENT_TYPES.TEXT,
        text: data.text || '',
        mediaUrl
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
      'sent': MESSAGE_STATUS.SENT,
      'delivered': MESSAGE_STATUS.DELIVERED,
      'read': MESSAGE_STATUS.READ,
      'failed': MESSAGE_STATUS.FAILED
    };
    
    return statusMap[status] || MESSAGE_STATUS.SENT;
  }
}

/**
 * Site Chat Adapter
 * 
 * Gerencia chat do próprio site (secret-chat e chat normal)
 * Usa Firestore como storage
 */

import { BaseChatAdapter } from './base-adapter';
import { UnifiedMessage, UnifiedConversation, ChatOperationResult, ChatParticipant } from '@/types/chat';
import { CHAT_CHANNELS, SENDER_TYPES, MESSAGE_STATUS, CONTENT_TYPES } from '@/lib/chat-constants';
import { getAdminDb } from '@/lib/firebase-admin';
import { collection, query, orderBy, limit as firestoreLimit, getDocs, addDoc, updateDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';

export class SiteChatAdapter extends BaseChatAdapter {
  readonly channel = CHAT_CHANNELS.SITE;

  async isConfigured(): Promise<boolean> {
    const db = getAdminDb();
    return db !== null;
  }

  async fetchConversations(adminUid: string): Promise<UnifiedConversation[]> {
    try {
      const db = getAdminDb();
      if (!db) throw new Error('Firestore não inicializado');

      // ✅ VERIFICAR SE É MAIN ADMIN (uma vez só, no início)
      const adminDoc = await db.collection('admins').doc(adminUid).get();
      const isMainAdmin = adminDoc.exists && adminDoc.data()?.isMainAdmin === true;

      // Buscar todos os chats
      const chatsRef = db.collection('chats');
      const snapshot = await chatsRef.orderBy('createdAt', 'desc').limit(200).get();

      const conversations: UnifiedConversation[] = [];

      for (const chatDoc of snapshot.docs) {
        const chatData = chatDoc.data();

        // ✅ LÓGICA DE FILTRAGEM CORRIGIDA:
        // - Main Admin: vê TODOS os chats
        // - Outros Admins: vêem apenas chats COM seu adminUid OU SEM adminUid (compatibilidade)
        if (!isMainAdmin) {
          if (chatData.adminUid && chatData.adminUid !== adminUid) {
            continue; // Pular este chat (pertence a outro admin)
          }
        }

        // Buscar última mensagem
        let lastMessage: UnifiedMessage | undefined;
        if (chatData.lastMessage) {
          lastMessage = this.convertToUnifiedMessage(chatDoc.id, chatData.lastMessage, adminUid);
        } else {
          // Buscar da subcoleção
          const messagesRef = chatDoc.ref.collection('messages');
          const lastMsgSnap = await messagesRef.orderBy('timestamp', 'desc').limit(1).get();
          if (!lastMsgSnap.empty) {
            const msgData = lastMsgSnap.docs[0].data();
            lastMessage = this.convertToUnifiedMessage(chatDoc.id, msgData, adminUid);
          }
        }

        // ✅ OTIMIZADO: Contar não lidas de forma mais eficiente
        // Em vez de usar '!=' que requer índice composto, buscamos apenas por 'read == false'
        // e filtramos por senderId no código
        let unreadCount = 0;
        try {
          const unreadRef = chatDoc.ref.collection('messages').where('read', '==', false);
          const unreadSnap = await unreadRef.get();
          // Filtrar mensagens que NÃO são do admin
          unreadCount = unreadSnap.docs.filter(doc => {
            const senderId = doc.data().senderId;
            return senderId !== 'admin';
          }).length;
        } catch (error) {
          console.warn('[SiteChatAdapter] Erro ao contar não lidas, usando 0:', error);
          unreadCount = 0;
        }

        const rawLastMessage = chatData.lastMessage;
        const fallbackName = this.getChatParticipantName(chatDoc.id);
        const participantDisplayName = chatData.userDisplayName || rawLastMessage?.userDisplayName;
        const participantEmail = chatData.userEmail || rawLastMessage?.userEmail;
        const participantUid = chatData.userUid || rawLastMessage?.realUserId;
        const participantName = participantDisplayName || participantEmail || (participantUid ? `UID ${String(participantUid).slice(0, 8)}` : fallbackName);

        conversations.push({
          id: chatDoc.id,
          channel: CHAT_CHANNELS.SITE,
          participant: {
            id: chatDoc.id,
            name: participantName,
            type: SENDER_TYPES.USER,
            email: participantEmail,
            metadata: {
              uid: participantUid || undefined,
              displayName: participantDisplayName || undefined,
              email: participantEmail || undefined,
            }
          },
          lastMessage,
          unreadCount,
          adminUid: chatData.adminUid || adminUid,
          archived: false,
          muted: false,
          starred: false,
          status: 'active',
          createdAt: this.normalizeTimestamp(chatData.createdAt),
          updatedAt: this.normalizeTimestamp(chatData.lastActivity || chatData.createdAt)
        });
      }

      return conversations;
    } catch (error) {
      console.error('[SiteChatAdapter] Erro ao buscar conversas:', error);
      return [];
    }
  }

  async fetchMessages(conversationId: string, adminUid: string, limit: number = 100): Promise<UnifiedMessage[]> {
    try {
      const db = getAdminDb();
      if (!db) throw new Error('Firestore não inicializado');

      // Verificar acesso ao chat
      const chatDoc = await db.collection('chats').doc(conversationId).get();
      if (!chatDoc.exists) {
        throw new Error('Chat não encontrado');
      }

      const chatData = chatDoc.data();

      // ✅ VERIFICAR SE É MAIN ADMIN
      const adminDoc = await db.collection('admins').doc(adminUid).get();
      const isMainAdmin = adminDoc.exists && adminDoc.data()?.isMainAdmin === true;

      // ✅ LÓGICA DE ACESSO CORRIGIDA:
      // - Main Admin: acesso a TODOS os chats
      // - Outros Admins: acesso apenas a chats COM seu adminUid OU SEM adminUid
      if (!isMainAdmin) {
        if (chatData?.adminUid && chatData.adminUid !== adminUid) {
          throw new Error('Acesso negado a este chat');
        }
      }

      // Buscar mensagens
      const messagesRef = chatDoc.ref.collection('messages');
      const snapshot = await messagesRef.orderBy('timestamp', 'asc').limit(limit).get();

      return snapshot.docs.map(doc => {
        const data = doc.data();
        return this.convertToUnifiedMessage(conversationId, { id: doc.id, ...data }, adminUid);
      });
    } catch (error) {
      console.error('[SiteChatAdapter] Erro ao buscar mensagens:', error);
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
      const db = getAdminDb();
      if (!db) throw new Error('Firestore não inicializado');

      const chatRef = db.collection('chats').doc(conversationId);
      const messagesRef = chatRef.collection('messages');

      const messageData = {
        text,
        senderId: 'admin',
        recipientId: recipientId || null,
        timestamp: new Date(),
        read: true
      };

      const docRef = await messagesRef.add(messageData);

      // Atualizar lastMessage no chat
      await chatRef.update({
        lastMessage: messageData,
        lastActivity: new Date()
      });

      const unifiedMessage = this.convertToUnifiedMessage(conversationId, {
        id: docRef.id,
        ...messageData
      }, adminUid);

      return this.createSuccessResult(unifiedMessage);
    } catch (error) {
      return this.createErrorResult(
        'SEND_MESSAGE_FAILED',
        error instanceof Error ? error.message : 'Erro ao enviar mensagem',
        error
      );
    }
  }

  private getChatParticipantName(chatId: string): string {
    if (!chatId) return 'Chat';

    if (chatId.startsWith('secret-chat-')) {
      const parts = chatId.split('-');
      const maybeTimestamp = parts.length >= 4 ? Number(parts[3]) : NaN;

      if (!Number.isNaN(maybeTimestamp) && maybeTimestamp > 0) {
        const date = new Date(maybeTimestamp);
        return `🔒 Chat Temporário (${date.toLocaleString('pt-BR')})`;
      }

      return '🔒 Chat Secreto';
    }

    return `Chat ${chatId.slice(0, 8)}`;
  }

  private convertToUnifiedMessage(conversationId: string, data: any, adminUid: string): UnifiedMessage {
    const senderId = data.senderId || data.sender || 'user';
    const isAdmin = senderId === 'admin';

    return {
      id: data.id || `msg-${Date.now()}`,
      channel: CHAT_CHANNELS.SITE,
      conversationId,
      sender: {
        id: isAdmin ? adminUid : senderId,
        name: isAdmin ? 'Admin' : 'Visitante',
        type: isAdmin ? SENDER_TYPES.ADMIN : SENDER_TYPES.USER
      },
      recipient: data.recipientId ? {
        id: data.recipientId,
        name: 'Destinatário',
        type: SENDER_TYPES.USER
      } : undefined,
      content: {
        type: data.videoUrl
          ? CONTENT_TYPES.VIDEO
          : data.imageUrl
            ? CONTENT_TYPES.IMAGE
            : data.fileUrl
              ? CONTENT_TYPES.FILE
              : data.isLocation
                ? CONTENT_TYPES.LOCATION
                : CONTENT_TYPES.TEXT,
        text: data.text || '',
        mediaUrl: data.videoUrl || data.imageUrl || data.fileUrl,
        fileName: data.fileName,
        location: data.isLocation || (data.latitude && data.longitude) ? {
          latitude: data.latitude || 0,
          longitude: data.longitude || 0
        } : undefined
      },
      status: MESSAGE_STATUS.SENT,
      timestamp: this.normalizeTimestamp(data.timestamp),
      read: Boolean(data.read),
      readAt: data.readAt ? this.normalizeTimestamp(data.readAt) : undefined,
      adminUid,
      metadata: {
        ...(data.metadata || {}),
        userEmail: data.userEmail,
        userDisplayName: data.userDisplayName,
        realUserId: data.realUserId,
        fileName: data.fileName,
      },
      createdAt: this.normalizeTimestamp(data.timestamp),
      updatedAt: this.normalizeTimestamp(data.timestamp)
    };
  }
}

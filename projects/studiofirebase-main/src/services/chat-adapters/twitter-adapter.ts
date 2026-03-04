/**
 * Twitter Chat Adapter
 *
 * Gerencia conversas via Twitter API usando OAuth
 * Permite restaurar histórico de DMs e tweets
 */

import { BaseChatAdapter } from './base-adapter';
import { UnifiedMessage, UnifiedConversation, ChatOperationResult } from '@/types/chat';
import { CHAT_CHANNELS, SENDER_TYPES, MESSAGE_STATUS, CONTENT_TYPES } from '@/lib/chat-constants';
import { getAdminDb, getAdminApp } from '@/lib/firebase-admin';
import { doc, getDoc } from 'firebase/firestore';
import { getDatabase } from 'firebase-admin/database';

interface TwitterCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

export class TwitterAdapter extends BaseChatAdapter {
  readonly channel = CHAT_CHANNELS.TWITTER;

  async isConfigured(): Promise<boolean> {
    // Verificar se há credenciais do Twitter configuradas
    try {
      const db = getAdminDb();
      if (!db) return false;

      // Verificar se há credenciais armazenadas no Firestore
      const credentialsDoc = await db.collection('admin').doc('integrations').get();
      const data = credentialsDoc.data();

      return !!(data?.twitter?.accessToken);
    } catch (error) {
      console.warn('[TwitterAdapter] Erro ao verificar configuração:', error);
      return false;
    }
  }

  async getCredentials(adminUid: string): Promise<TwitterCredentials | null> {
    try {
      // Primeiro tentar buscar do cookie (mais recente)
      // Nota: Em server-side, não temos acesso direto aos cookies do browser
      // Então vamos buscar do Firestore onde são armazenadas pelo callback

      const db = getAdminDb();
      if (!db) return null;

      // Buscar credenciais do admin específico
      const adminDoc = await db.collection('admins').doc(adminUid).get();
      const adminData = adminDoc.data();

      if (adminData?.twitterCredentials) {
        return adminData.twitterCredentials;
      }

      // Fallback: buscar das configurações globais (Realtime Database)
      try {
        const adminApp = getAdminApp();
        if (adminApp) {
          const rtdb = getDatabase(adminApp);
          const snap = await rtdb.ref('admin/integrations/twitter').get();
          const twitterData = snap?.val();

          if (twitterData?.connected) {
            // Se temos dados do RTDB, converter para o formato esperado
            return {
              accessToken: twitterData.accessToken || '',
              refreshToken: twitterData.refreshToken || null,
              expiresAt: twitterData.expiresAt || null
            };
          }
        }
      } catch (rtdbError) {
        console.warn('[TwitterAdapter] Erro ao buscar do RTDB:', rtdbError);
      }

      return null;
    } catch (error) {
      console.error('[TwitterAdapter] Erro ao buscar credenciais:', error);
      return null;
    }
  }

  async refreshAccessToken(credentials: TwitterCredentials): Promise<TwitterCredentials | null> {
    // TODO: Implementar refresh token do Twitter OAuth 2.0
    // Por enquanto, retorna as credenciais existentes
    return credentials;
  }

  async makeTwitterAPIRequest(
    endpoint: string,
    credentials: TwitterCredentials,
    options: RequestInit = {}
  ): Promise<any> {
    const baseURL = 'https://api.x.com/2';

    // Verificar se token precisa de refresh
    let currentCredentials = credentials;
    if (credentials.expiresAt && Date.now() > credentials.expiresAt) {
      currentCredentials = await this.refreshAccessToken(credentials) || credentials;
    }

    const response = await fetch(`${baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${currentCredentials.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Token do Twitter expirado ou inválido');
      }
      throw new Error(`Erro na API do Twitter: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async fetchConversations(adminUid: string): Promise<UnifiedConversation[]> {
    try {
      const credentials = await this.getCredentials(adminUid);
      if (!credentials) {
        console.warn('[TwitterAdapter] Credenciais não encontradas');
        return [];
      }

      // Descobrir o user_id do admin autenticado
      const me = await this.makeTwitterAPIRequest('/users/me?user.fields=username', credentials);
      const myUserId = me?.data?.id as string | undefined;

      // Buscar eventos recentes de DM
      const events = await this.makeTwitterAPIRequest(
        '/dm_events?max_results=100&dm_event.fields=created_at,sender_id,text,dm_conversation_id,event_type&expansions=sender_id&user.fields=username,name,profile_image_url',
        credentials
      );

      const userMap = new Map<string, { id: string; username?: string; name?: string }>();
      for (const user of events?.includes?.users || []) {
        userMap.set(user.id, user);
      }

      const byConversation = new Map<string, any[]>();
      for (const event of events?.data || []) {
        const conversationId = event.dm_conversation_id || event.id;
        if (!conversationId) continue;
        if (!byConversation.has(conversationId)) byConversation.set(conversationId, []);
        byConversation.get(conversationId)!.push(event);
      }

      const conversations: UnifiedConversation[] = [];

      for (const [conversationId, convEvents] of byConversation.entries()) {
        const sorted = convEvents.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const lastEvent = sorted[sorted.length - 1];

        let participantId = lastEvent?.sender_id || 'unknown';
        if (conversationId.includes('-') && myUserId) {
          const parts = conversationId.split('-');
          participantId = parts.find((p: string) => p !== myUserId) || participantId;
        }

        const participantUser = userMap.get(participantId);
        const participantName = participantUser?.username || participantUser?.name || 'X User';

        const lastMessage = lastEvent?.id ? {
          id: lastEvent.id,
          channel: CHAT_CHANNELS.TWITTER,
          conversationId: `twitter_dm_${conversationId}`,
          sender: {
            id: lastEvent.sender_id || 'unknown',
            name: userMap.get(lastEvent.sender_id)?.username || 'X User',
            type: lastEvent.sender_id === myUserId ? SENDER_TYPES.ADMIN : SENDER_TYPES.USER
          },
          content: {
            type: CONTENT_TYPES.TEXT,
            text: lastEvent.text || ''
          },
          timestamp: lastEvent.created_at || new Date().toISOString(),
          read: true,
          status: MESSAGE_STATUS.DELIVERED,
          createdAt: lastEvent.created_at || new Date().toISOString(),
          updatedAt: lastEvent.created_at || new Date().toISOString()
        } : undefined;

        conversations.push({
          id: `twitter_dm_${conversationId}`,
          channel: CHAT_CHANNELS.TWITTER,
          participant: {
            id: participantId,
            name: participantName,
            type: SENDER_TYPES.USER
          },
          lastMessage,
          unreadCount: 0,
          adminUid,
          archived: false,
          muted: false,
          starred: false,
          status: 'active',
          createdAt: sorted[0]?.created_at || new Date().toISOString(),
          updatedAt: lastEvent?.created_at || new Date().toISOString()
        });
      }

      return conversations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch (error) {
      console.error('[TwitterAdapter] Erro ao buscar conversas:', error);
      return [];
    }
  }

  async fetchMessages(conversationId: string, adminUid: string, limit: number = 100): Promise<UnifiedMessage[]> {
    try {
      const credentials = await this.getCredentials(adminUid);
      if (!credentials) {
        throw new Error('Credenciais do Twitter não encontradas');
      }

      // Extrair ID da conversa do Twitter
      const twitterConversationId = conversationId.replace('twitter_dm_', '');

      const me = await this.makeTwitterAPIRequest('/users/me', credentials);
      const myUserId = me?.data?.id as string | undefined;

      // Buscar mensagens da conversa
      const messages = await this.makeTwitterAPIRequest(
        `/dm_conversations/${twitterConversationId}/dm_events?max_results=${limit}&dm_event.fields=created_at,sender_id,text,dm_conversation_id,event_type&expansions=sender_id&user.fields=username`,
        credentials
      );

      const userMap = new Map<string, { id: string; username?: string }>();
      for (const user of messages?.includes?.users || []) {
        userMap.set(user.id, user);
      }

      return (messages.data || []).map((msg: any) => ({
        id: msg.id,
        channel: CHAT_CHANNELS.TWITTER,
        conversationId,
        sender: {
          id: msg.sender_id,
          name: userMap.get(msg.sender_id)?.username || 'X User',
          type: myUserId && msg.sender_id === myUserId ? SENDER_TYPES.ADMIN : SENDER_TYPES.USER
        },
        content: {
          type: CONTENT_TYPES.TEXT,
          text: msg.text || ''
        },
        timestamp: msg.created_at,
        read: true,
        status: MESSAGE_STATUS.DELIVERED
      }));
    } catch (error) {
      console.error('[TwitterAdapter] Erro ao buscar mensagens:', error);
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
      const credentials = await this.getCredentials(adminUid);
      if (!credentials) {
        throw new Error('Credenciais do Twitter não encontradas');
      }

      // Extrair ID da conversa do Twitter
      const twitterConversationId = conversationId.replace('twitter_dm_', '');
      const useConversationId = twitterConversationId && twitterConversationId !== recipientId;
      const endpoint = useConversationId
        ? `/dm_conversations/${twitterConversationId}/messages`
        : `/dm_conversations/with/${encodeURIComponent(recipientId)}/messages`;

      // Enviar DM
      const response = await this.makeTwitterAPIRequest(endpoint, credentials, {
        method: 'POST',
        body: JSON.stringify({ text })
      });

      const sentMessage = response.data || response;

      return {
        success: true,
        data: {
          id: sentMessage.id,
          channel: CHAT_CHANNELS.TWITTER,
          conversationId,
          sender: {
            id: adminUid,
            name: 'Admin',
            type: SENDER_TYPES.ADMIN
          },
          content: {
            type: CONTENT_TYPES.TEXT,
            text: sentMessage.text || text
          },
          timestamp: sentMessage.created_at || new Date().toISOString(),
          read: true,
          status: MESSAGE_STATUS.DELIVERED,
          createdAt: sentMessage.created_at || new Date().toISOString(),
          updatedAt: sentMessage.created_at || new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('[TwitterAdapter] Erro ao enviar mensagem:', error);
      return {
        success: false,
        error: {
          code: 'SEND_MESSAGE_FAILED',
          message: error instanceof Error ? error.message : 'Erro desconhecido',
          details: error
        }
      };
    }
  }

  async markAsRead(messageIds: string[], adminUid: string): Promise<ChatOperationResult<void>> {
    // TODO: Implementar marcação como lida no Twitter
    console.log('[TwitterAdapter] markAsRead não implementado ainda');
    return { success: true };
  }
}
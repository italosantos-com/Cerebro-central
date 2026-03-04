/**
 * Unified Chat Service
 * 
 * Orquestra todos os adapters de chat e fornece interface única
 * para acessar mensagens de todas as plataformas
 */

import { ChatAdapter } from './chat-adapters/base-adapter';
import { SiteChatAdapter } from './chat-adapters/site-adapter';
import { WhatsAppAdapter } from './chat-adapters/whatsapp-adapter';
import { TwitterAdapter } from './chat-adapters/twitter-adapter';
import { FacebookAdapter } from './chat-adapters/facebook-adapter';
import { InstagramAdapter } from './chat-adapters/instagram-adapter';
import { UnifiedMessage, UnifiedConversation, ChatOperationResult } from '@/types/chat';
import { CHAT_CHANNELS, ChatChannel } from '@/lib/chat-constants';

export class UnifiedChatService {
  private adapters: Map<ChatChannel, ChatAdapter> = new Map();

  constructor() {
    // Registrar adapters implementados
    this.registerAdapter(new SiteChatAdapter());
    this.registerAdapter(new WhatsAppAdapter());
    this.registerAdapter(new TwitterAdapter());
    this.registerAdapter(new FacebookAdapter());
    this.registerAdapter(new InstagramAdapter());
  }

  /**
   * Registra um adapter de chat
   */
  private registerAdapter(adapter: ChatAdapter) {
    this.adapters.set(adapter.channel, adapter);
  }

  /**
   * Busca o adapter para um canal específico
   */
  private getAdapter(channel: ChatChannel): ChatAdapter | undefined {
    return this.adapters.get(channel);
  }

  /**
   * Busca conversas de um ou mais canais
   */
  async fetchConversations(adminUid: string, channels?: ChatChannel[]): Promise<UnifiedConversation[]> {
    try {
      // Se channels for 'all' ou não especificado, buscar de todos
      const targetChannels = channels && channels[0] !== CHAT_CHANNELS.ALL
        ? channels
        : Array.from(this.adapters.keys());

      // Buscar conversas de cada canal em paralelo
      const promises = targetChannels.map(async (channel) => {
        const adapter = this.getAdapter(channel);
        if (!adapter) {
          console.warn(`[UnifiedChatService] Adapter não encontrado para canal: ${channel}`);
          return [];
        }

        // Verificar se está configurado
        const isConfigured = await adapter.isConfigured();
        if (!isConfigured) {
          console.warn(`[UnifiedChatService] Adapter ${channel} não está configurado`);
          return [];
        }

        try {
          return await adapter.fetchConversations(adminUid);
        } catch (error) {
          console.error(`[UnifiedChatService] Erro ao buscar conversas de ${channel}:`, error);
          return [];
        }
      });

      const results = await Promise.all(promises);
      
      // Combinar e ordenar por data de atualização
      const allConversations = results.flat();
      allConversations.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      return allConversations;
    } catch (error) {
      console.error('[UnifiedChatService] Erro ao buscar conversas:', error);
      return [];
    }
  }

  /**
   * Busca mensagens de uma conversa específica
   */
  async fetchMessages(
    channel: ChatChannel,
    conversationId: string,
    adminUid: string,
    limit?: number
  ): Promise<UnifiedMessage[]> {
    try {
      const adapter = this.getAdapter(channel);
      if (!adapter) {
        throw new Error(`Adapter não encontrado para canal: ${channel}`);
      }

      const isConfigured = await adapter.isConfigured();
      if (!isConfigured) {
        throw new Error(`Adapter ${channel} não está configurado`);
      }

      return await adapter.fetchMessages(conversationId, adminUid, limit);
    } catch (error) {
      console.error(`[UnifiedChatService] Erro ao buscar mensagens de ${channel}:`, error);
      throw error;
    }
  }

  /**
   * Envia uma mensagem
   */
  async sendMessage(
    channel: ChatChannel,
    conversationId: string,
    recipientId: string,
    text: string,
    adminUid: string
  ): Promise<ChatOperationResult<UnifiedMessage>> {
    try {
      const adapter = this.getAdapter(channel);
      if (!adapter) {
        return {
          success: false,
          error: {
            code: 'ADAPTER_NOT_FOUND',
            message: `Adapter não encontrado para canal: ${channel}`
          }
        };
      }

      const isConfigured = await adapter.isConfigured();
      if (!isConfigured) {
        return {
          success: false,
          error: {
            code: 'ADAPTER_NOT_CONFIGURED',
            message: `Adapter ${channel} não está configurado`
          }
        };
      }

      return await adapter.sendMessage(conversationId, recipientId, text, adminUid);
    } catch (error) {
      console.error(`[UnifiedChatService] Erro ao enviar mensagem em ${channel}:`, error);
      return {
        success: false,
        error: {
          code: 'SEND_MESSAGE_FAILED',
          message: error instanceof Error ? error.message : 'Erro ao enviar mensagem',
          details: error
        }
      };
    }
  }

  /**
   * Marca mensagens como lidas
   */
  async markAsRead(
    channel: ChatChannel,
    messageIds: string[],
    adminUid: string
  ): Promise<ChatOperationResult<void>> {
    try {
      const adapter = this.getAdapter(channel);
      if (!adapter) {
        return {
          success: false,
          error: {
            code: 'ADAPTER_NOT_FOUND',
            message: `Adapter não encontrado para canal: ${channel}`
          }
        };
      }

      return await adapter.markAsRead(messageIds, adminUid);
    } catch (error) {
      console.error(`[UnifiedChatService] Erro ao marcar como lidas em ${channel}:`, error);
      return {
        success: false,
        error: {
          code: 'MARK_READ_FAILED',
          message: error instanceof Error ? error.message : 'Erro ao marcar como lida',
          details: error
        }
      };
    }
  }

  /**
   * Verifica quais adapters estão configurados
   */
  async getConfiguredChannels(): Promise<ChatChannel[]> {
    const channels: ChatChannel[] = [];
    
    for (const [channel, adapter] of this.adapters) {
      const isConfigured = await adapter.isConfigured();
      if (isConfigured) {
        channels.push(channel);
      }
    }

    return channels;
  }

  /**
   * Busca estatísticas agregadas de todos os canais
   */
  async getStatistics(adminUid: string): Promise<{
    totalConversations: number;
    totalUnread: number;
    byChannel: Record<string, { conversations: number; unread: number }>;
  }> {
    try {
      const conversations = await this.fetchConversations(adminUid);
      
      const stats = {
        totalConversations: conversations.length,
        totalUnread: conversations.reduce((sum, conv) => sum + conv.unreadCount, 0),
        byChannel: {} as Record<string, { conversations: number; unread: number }>
      };

      // Agrupar por canal
      for (const conv of conversations) {
        if (!stats.byChannel[conv.channel]) {
          stats.byChannel[conv.channel] = { conversations: 0, unread: 0 };
        }
        stats.byChannel[conv.channel].conversations++;
        stats.byChannel[conv.channel].unread += conv.unreadCount;
      }

      return stats;
    } catch (error) {
      console.error('[UnifiedChatService] Erro ao calcular estatísticas:', error);
      return {
        totalConversations: 0,
        totalUnread: 0,
        byChannel: {}
      };
    }
  }
}

// Exportar instância singleton
export const unifiedChatService = new UnifiedChatService();

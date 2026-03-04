/**
 * Adapter Base para Canais de Chat
 * 
 * Define a interface comum que todos os adapters de chat devem implementar
 */

import { UnifiedMessage, UnifiedConversation, ChatOperationResult } from '@/types/chat';
import { ChatChannel } from '@/lib/chat-constants';

export interface ChatAdapter {
  /**
   * Canal que este adapter gerencia
   */
  readonly channel: ChatChannel;
  
  /**
   * Verifica se o adapter está configurado corretamente
   */
  isConfigured(): Promise<boolean>;
  
  /**
   * Busca todas as conversas do canal
   */
  fetchConversations(adminUid: string): Promise<UnifiedConversation[]>;
  
  /**
   * Busca mensagens de uma conversa específica
   */
  fetchMessages(conversationId: string, adminUid: string, limit?: number): Promise<UnifiedMessage[]>;
  
  /**
   * Envia uma mensagem
   */
  sendMessage(
    conversationId: string, 
    recipientId: string,
    text: string,
    adminUid: string
  ): Promise<ChatOperationResult<UnifiedMessage>>;
  
  /**
   * Marca mensagens como lidas
   */
  markAsRead(messageIds: string[], adminUid: string): Promise<ChatOperationResult<void>>;
  
  /**
   * Verifica se há mensagens novas (para polling)
   */
  checkNewMessages?(conversationId: string, adminUid: string, since: string): Promise<UnifiedMessage[]>;
}

/**
 * Classe base abstrata para implementação de adapters
 */
export abstract class BaseChatAdapter implements ChatAdapter {
  abstract readonly channel: ChatChannel;
  
  /**
   * Verifica configuração padrão (pode ser sobrescrito)
   */
  async isConfigured(): Promise<boolean> {
    return true;
  }
  
  /**
   * Deve ser implementado por cada adapter
   */
  abstract fetchConversations(adminUid: string): Promise<UnifiedConversation[]>;
  
  /**
   * Deve ser implementado por cada adapter
   */
  abstract fetchMessages(conversationId: string, adminUid: string, limit?: number): Promise<UnifiedMessage[]>;
  
  /**
   * Deve ser implementado por cada adapter
   */
  abstract sendMessage(
    conversationId: string,
    recipientId: string,
    text: string,
    adminUid: string
  ): Promise<ChatOperationResult<UnifiedMessage>>;
  
  /**
   * Implementação padrão de markAsRead (pode ser sobrescrito)
   */
  async markAsRead(messageIds: string[], adminUid: string): Promise<ChatOperationResult<void>> {
    try {
      // Implementação padrão - adapters específicos podem sobrescrever
      console.log(`[${this.channel}] Marcando mensagens como lidas:`, messageIds.length);
      return { success: true };
    } catch (error) {
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
   * Helper para criar resultado de sucesso
   */
  protected createSuccessResult<T>(data: T): ChatOperationResult<T> {
    return { success: true, data };
  }
  
  /**
   * Helper para criar resultado de erro
   */
  protected createErrorResult(code: string, message: string, details?: any): ChatOperationResult {
    return {
      success: false,
      error: { code, message, details }
    };
  }
  
  /**
   * Helper para normalizar timestamp
   */
  protected normalizeTimestamp(value: any): string {
    if (!value) return new Date().toISOString();
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    if (value.toDate && typeof value.toDate === 'function') return value.toDate().toISOString();
    if (value.seconds) return new Date(value.seconds * 1000).toISOString();
    return new Date().toISOString();
  }
}

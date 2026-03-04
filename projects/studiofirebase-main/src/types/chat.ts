/**
 * Tipos TypeScript para o Sistema de Chat Unificado
 * 
 * Define interfaces e tipos para todas as entidades do chat
 */

import { ChatChannel, ContentType, MessageStatus, SenderType } from '@/lib/chat-constants';

// ============================================
// PARTICIPANTES
// ============================================

export interface ChatParticipant {
  /** ID único do participante */
  id: string;
  
  /** Nome de exibição */
  name: string;
  
  /** URL do avatar/foto */
  avatarUrl?: string;
  
  /** ID na plataforma externa (ex: PSID do Facebook, WAID do WhatsApp) */
  externalId?: string;
  
  /** Tipo do participante */
  type: SenderType;
  
  /** Email (se disponível) */
  email?: string;
  
  /** Telefone (se disponível) */
  phone?: string;
  
  /** Metadados adicionais */
  metadata?: Record<string, any>;
}

// ============================================
// CONTEÚDO DE MENSAGEM
// ============================================

export interface MessageContent {
  /** Tipo do conteúdo */
  type: ContentType;
  
  /** Texto da mensagem (para type='text') */
  text?: string;
  
  /** URL da mídia (para image/video/audio/file) */
  mediaUrl?: string;
  
  /** Nome do arquivo (para type='file') */
  fileName?: string;
  
  /** Tamanho do arquivo em bytes */
  fileSize?: number;
  
  /** Tipo MIME */
  mimeType?: string;
  
  /** Localização geográfica (para type='location') */
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
    name?: string;
  };
  
  /** Thumbnail/preview (para vídeos/imagens) */
  thumbnailUrl?: string;
  
  /** Duração em segundos (para áudio/vídeo) */
  duration?: number;
}

// ============================================
// MENSAGEM UNIFICADA
// ============================================

export interface UnifiedMessage {
  /** ID único da mensagem */
  id: string;
  
  /** Canal de origem */
  channel: ChatChannel;
  
  /** ID da conversa */
  conversationId: string;
  
  /** Remetente */
  sender: ChatParticipant;
  
  /** Destinatário (quando aplicável) */
  recipient?: ChatParticipant;
  
  /** Conteúdo da mensagem */
  content: MessageContent;
  
  /** Status da mensagem */
  status: MessageStatus;
  
  /** Data/hora de envio */
  timestamp: string;
  
  /** Se foi lida pelo destinatário */
  read: boolean;
  
  /** Data/hora de leitura (quando read=true) */
  readAt?: string;
  
  /** ID na plataforma externa */
  externalId?: string;
  
  /** ID do admin responsável */
  adminUid?: string;
  
  /** Resposta a outra mensagem */
  replyTo?: {
    id: string;
    text?: string;
    sender: string;
  };
  
  /** Reações à mensagem */
  reactions?: Array<{
    emoji: string;
    userId: string;
    timestamp: string;
  }>;
  
  /** Metadados extras */
  metadata?: Record<string, any>;
  
  /** Data de criação no sistema */
  createdAt: string;
  
  /** Data de última atualização */
  updatedAt: string;
}

// ============================================
// CONVERSA UNIFICADA
// ============================================

export interface UnifiedConversation {
  /** ID único da conversa */
  id: string;
  
  /** Canal de origem */
  channel: ChatChannel;
  
  /** Participante (não-admin) */
  participant: ChatParticipant;
  
  /** Última mensagem */
  lastMessage?: UnifiedMessage;
  
  /** Número de mensagens não lidas */
  unreadCount: number;
  
  /** ID do admin responsável */
  adminUid: string;
  
  /** Se a conversa está arquivada */
  archived: boolean;
  
  /** Se a conversa está silenciada */
  muted: boolean;
  
  /** Se a conversa foi marcada como importante */
  starred: boolean;
  
  /** Tags/labels da conversa */
  tags?: string[];
  
  /** Notas internas sobre a conversa */
  notes?: string;
  
  /** Status da conversa */
  status: 'active' | 'closed' | 'pending';
  
  /** Data de criação */
  createdAt: string;
  
  /** Data de última mensagem */
  updatedAt: string;
  
  /** Data de fechamento (se status='closed') */
  closedAt?: string;
  
  /** Metadados extras */
  metadata?: Record<string, any>;
}

// ============================================
// CONFIGURAÇÕES DE AUTO-RESPOSTA
// ============================================

export interface AutoReplySettings {
  /** Se auto-resposta está habilitada */
  enabled: boolean;
  
  /** Tom das respostas */
  tone: 'humanized' | 'robotic';
  
  /** Mensagem padrão de ausência */
  awayMessage?: string;
  
  /** Horário de funcionamento */
  businessHours?: {
    enabled: boolean;
    timezone: string;
    schedule: Array<{
      day: number; // 0=domingo, 6=sábado
      start: string; // formato HH:mm
      end: string;
    }>;
  };
  
  /** Palavras-chave para respostas automáticas */
  keywords?: Array<{
    keyword: string;
    response: string;
    caseSensitive?: boolean;
  }>;
  
  /** Delay antes de enviar resposta automática (segundos) */
  delay?: number;
  
  /** Canais onde auto-resposta está ativa */
  activeChannels?: ChatChannel[];
}

// ============================================
// ESTATÍSTICAS DE CHAT
// ============================================

export interface ChatStatistics {
  /** Total de conversas */
  totalConversations: number;
  
  /** Conversas ativas */
  activeConversations: number;
  
  /** Total de mensagens */
  totalMessages: number;
  
  /** Mensagens não lidas */
  unreadMessages: number;
  
  /** Tempo médio de resposta (segundos) */
  avgResponseTime: number;
  
  /** Taxa de resposta (%) */
  responseRate: number;
  
  /** Estatísticas por canal */
  byChannel: Record<ChatChannel, {
    conversations: number;
    messages: number;
    unread: number;
  }>;
  
  /** Período das estatísticas */
  period: {
    start: string;
    end: string;
  };
}

// ============================================
// FILTROS E ORDENAÇÃO
// ============================================

export interface ChatFilters {
  /** Filtrar por canal */
  channel?: ChatChannel | 'all';
  
  /** Filtrar por status */
  status?: 'active' | 'closed' | 'pending';
  
  /** Apenas não lidas */
  unreadOnly?: boolean;
  
  /** Apenas arquivadas */
  archivedOnly?: boolean;
  
  /** Apenas marcadas */
  starredOnly?: boolean;
  
  /** Buscar por texto */
  searchQuery?: string;
  
  /** Filtrar por tags */
  tags?: string[];
  
  /** Período de tempo */
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface ChatSorting {
  /** Campo para ordenar */
  field: 'updatedAt' | 'createdAt' | 'unreadCount' | 'participant.name';
  
  /** Direção */
  direction: 'asc' | 'desc';
}

// ============================================
// EVENTOS DE CHAT
// ============================================

export type ChatEventType = 
  | 'message.sent'
  | 'message.received'
  | 'message.read'
  | 'message.failed'
  | 'conversation.created'
  | 'conversation.updated'
  | 'conversation.closed'
  | 'typing.start'
  | 'typing.stop'
  | 'presence.online'
  | 'presence.offline';

export interface ChatEvent {
  type: ChatEventType;
  conversationId: string;
  channel: ChatChannel;
  data: any;
  timestamp: string;
}

// ============================================
// RESULTADO DE OPERAÇÕES
// ============================================

export interface ChatOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

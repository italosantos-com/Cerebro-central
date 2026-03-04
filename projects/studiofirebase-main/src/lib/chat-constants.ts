/**
 * Constantes Globais do Sistema de Chat
 * 
 * Define nomenclatura padronizada para todos os canais de comunicação
 * Usar estas constantes em TODOS os arquivos para manter consistência
 */

// ============================================
// CANAIS DE COMUNICAÇÃO
// ============================================

export const CHAT_CHANNELS = {
  SITE: 'site',
  WHATSAPP: 'whatsapp',
  FACEBOOK: 'facebook',
  INSTAGRAM: 'instagram',
  TWITTER: 'twitter',
  ALL: 'all'
} as const;

export type ChatChannel = typeof CHAT_CHANNELS[keyof typeof CHAT_CHANNELS];

// ============================================
// LABELS AMIGÁVEIS
// ============================================

export const CHAT_LABELS: Record<ChatChannel | 'all', string> = {
  [CHAT_CHANNELS.SITE]: '💬 Chat do Site',
  [CHAT_CHANNELS.WHATSAPP]: '📱 WhatsApp',
  [CHAT_CHANNELS.FACEBOOK]: '📘 Facebook',
  [CHAT_CHANNELS.INSTAGRAM]: '📸 Instagram',
  [CHAT_CHANNELS.TWITTER]: '🐦 Twitter/X',
  [CHAT_CHANNELS.ALL]: '📂 Todos os Canais'
};

// ============================================
// CORES DOS BADGES
// ============================================

export const CHAT_COLORS: Record<ChatChannel, string> = {
  [CHAT_CHANNELS.SITE]: 'bg-gray-500 text-white',
  [CHAT_CHANNELS.WHATSAPP]: 'bg-green-500 text-white',
  [CHAT_CHANNELS.FACEBOOK]: 'bg-blue-500 text-white',
  [CHAT_CHANNELS.INSTAGRAM]: 'bg-pink-500 text-white',
  [CHAT_CHANNELS.TWITTER]: 'bg-sky-500 text-white',
  [CHAT_CHANNELS.ALL]: 'bg-zinc-700 text-white'
};

// ============================================
// ÍCONES DOS CANAIS
// ============================================

export const CHAT_ICONS: Record<ChatChannel, string> = {
  [CHAT_CHANNELS.SITE]: '💬',
  [CHAT_CHANNELS.WHATSAPP]: '📱',
  [CHAT_CHANNELS.FACEBOOK]: '📘',
  [CHAT_CHANNELS.INSTAGRAM]: '📸',
  [CHAT_CHANNELS.TWITTER]: '🐦',
  [CHAT_CHANNELS.ALL]: '📂'
};

// ============================================
// ESTADOS DE MENSAGEM
// ============================================

export const MESSAGE_STATUS = {
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed'
} as const;

export type MessageStatus = typeof MESSAGE_STATUS[keyof typeof MESSAGE_STATUS];

// ============================================
// TIPOS DE CONTEÚDO
// ============================================

export const CONTENT_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  FILE: 'file',
  LOCATION: 'location',
  STICKER: 'sticker'
} as const;

export type ContentType = typeof CONTENT_TYPES[keyof typeof CONTENT_TYPES];

// ============================================
// REMETENTES
// ============================================

export const SENDER_TYPES = {
  ADMIN: 'admin',
  USER: 'user',
  SYSTEM: 'system'
} as const;

export type SenderType = typeof SENDER_TYPES[keyof typeof SENDER_TYPES];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Retorna o label amigável de um canal
 */
export function getChannelLabel(channel: ChatChannel | 'all'): string {
  return CHAT_LABELS[channel] || channel;
}

/**
 * Retorna a classe CSS para o badge de um canal
 */
export function getChannelColor(channel: ChatChannel): string {
  return CHAT_COLORS[channel] || 'bg-zinc-500 text-white';
}

/**
 * Retorna o ícone de um canal
 */
export function getChannelIcon(channel: ChatChannel): string {
  return CHAT_ICONS[channel] || '💬';
}

/**
 * Verifica se um canal é válido
 */
export function isValidChannel(channel: string): channel is ChatChannel {
  return Object.values(CHAT_CHANNELS).includes(channel as ChatChannel);
}

/**
 * Lista de todos os canais (exceto 'all')
 */
export const ALL_CHAT_CHANNELS: ChatChannel[] = [
  CHAT_CHANNELS.SITE,
  CHAT_CHANNELS.WHATSAPP,
  CHAT_CHANNELS.FACEBOOK,
  CHAT_CHANNELS.INSTAGRAM,
  CHAT_CHANNELS.TWITTER
];

/**
 * Lista de opções para filtros (incluindo 'all')
 */
export const CHANNEL_FILTER_OPTIONS = [
  { key: CHAT_CHANNELS.ALL, label: CHAT_LABELS[CHAT_CHANNELS.ALL] },
  { key: CHAT_CHANNELS.SITE, label: CHAT_LABELS[CHAT_CHANNELS.SITE] },
  { key: CHAT_CHANNELS.WHATSAPP, label: CHAT_LABELS[CHAT_CHANNELS.WHATSAPP] },
  { key: CHAT_CHANNELS.FACEBOOK, label: CHAT_LABELS[CHAT_CHANNELS.FACEBOOK] },
  { key: CHAT_CHANNELS.INSTAGRAM, label: CHAT_LABELS[CHAT_CHANNELS.INSTAGRAM] },
  { key: CHAT_CHANNELS.TWITTER, label: CHAT_LABELS[CHAT_CHANNELS.TWITTER] }
] as const;

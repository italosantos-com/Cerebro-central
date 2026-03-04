"use client";

import { useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Send, X, Bot, User, Wrench, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { getAuth } from 'firebase/auth';
import { addDoc, collection, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

type MessageRole = 'assistant' | 'user' | 'system';

type ModelTier = 'fast' | 'high';

interface Message {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: string;
  media?: MediaItem;
}

interface CentralAssistantWidgetProps {
  isOpen: boolean;
  onClose?: () => void;
}

type MediaKind = 'image' | 'video';

interface MediaItem {
  id: string;
  url: string;
  kind: MediaKind;
  fileName: string;
  storageType?: string;
  title: string;
  description?: string;
}

interface PendingSchedule {
  audience: 'admins';
  date?: string;
  time?: string;
  message?: string;
}

interface ScheduleResponse {
  ok: boolean;
  id?: string;
  error?: string;
}

const COMMANDS = [
  '/ajuda',
  '/status',
  '/humano',
  '/microservicos',
  '/tickets'
];

const MICROservices = [
  'buscar informacoes de usuario',
  'verificar assinatura',
  'presentear dias de assinatura',
  'enviar mensagem no chat secreto',
  'cancelar/remover assinante',
  'limpar assinantes expirados',
  'remover expirados antigos',
  'reenviar email de confirmacao',
  'reenviar MFA (OTP)',
  'enviar mensagem (canais sociais)',
  'enviar mensagem em massa',
  'agendar tarefas',
  'agendar publicacao de foto/video',
  'enviar email',
  'criar pagamento PIX',
  'criar pagamento PayPal',
  'listar conteudo exclusivo',
  'buscar avaliacoes',
  'estatisticas da plataforma',
  'status dos servicos',
  'reset de senha',
  'verificar admin por foto/video (anti-fake)'
];

const uniqueId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function buildSystemMessage(): Message {
  return {
    id: 'system-intro',
    role: 'system',
    timestamp: new Date().toISOString(),
    text: `Bem-vindo ao Cérebro Central.\n\nMicroserviços disponíveis:\n${MICROservices.map((item) => `• ${item}`).join('\n')}\n\nVocê também pode conversar livremente ou solicitar atendimento humano.`
  };
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function containsAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function formatMessageText(value: unknown) {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function safeParseJson(value: string) {
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function extractAssistantText(raw: unknown) {
  if (typeof raw === 'string') {
    const parsed = safeParseJson(raw);
    if (parsed && typeof parsed === 'object') {
      const candidate = (parsed as any)?.result ?? (parsed as any)?.message ?? (parsed as any)?.data;
      if (typeof candidate === 'string') return candidate;
      if (candidate && typeof candidate === 'object' && typeof (candidate as any).result === 'string') {
        return (candidate as any).result;
      }
    }
    return raw;
  }

  if (raw && typeof raw === 'object') {
    const candidate = (raw as any)?.result ?? (raw as any)?.message ?? (raw as any)?.data;
    if (typeof candidate === 'string') return candidate;
    if (candidate && typeof candidate === 'object' && typeof (candidate as any).result === 'string') {
      return (candidate as any).result;
    }
  }

  return formatMessageText(raw);
}

function isAffirmativeResponse(text: string) {
  const normalized = normalizeText(text);
  return containsAny(normalized, ['sim', 'ok', 'confirmo', 'pode enviar', 'pode', 'confirmar', 'manda', 'envia']);
}

function isNegativeResponse(text: string) {
  const normalized = normalizeText(text);
  return containsAny(normalized, ['nao', 'não', 'cancelar', 'cancela', 'pare', 'parar']);
}

function findLastAssistantConfirmation(messages: Message[]) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg.role !== 'assistant') continue;
    const normalized = normalizeText(msg.text);
    if (containsAny(normalized, ['confirma', 'confirmar', 'confirmacao', 'confirma?'])) {
      return { index: i, message: msg };
    }
  }
  return null;
}

function detectMicroserviceIntent(normalized: string) {
  if (containsAny(normalized, ['senha', 'alterar senha', 'trocar senha', 'resetar senha'])) {
    return 'alterar senha';
  }
  if (containsAny(normalized, ['presente', 'enviar presente', 'mandar presente', 'gift'])) {
    return 'enviar presente';
  }
  if (containsAny(normalized, ['agendar publicacao', 'agendar publicação', 'postagem', 'publicar'])) {
    return 'agendar publicação';
  }
  if (containsAny(normalized, ['agendar mensagem', 'mensagem automatica', 'mensagem automática'])) {
    return 'agendar mensagem automática';
  }
  return null;
}

function parseScheduleRequest(text: string) {
  const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);
  const timeMatch = text.match(/\b(\d{2}:\d{2})\b/);
  const messageMatch = text.match(/\|\s*([^|]+?)\s*\|/);
  const messageInlineMatch = text.match(/mensagem\s*[:\-]?\s*(.+)$/i);
  const messageEscritoMatch = text.match(/escrito\s+(.+)$/i);
  const messageTextoMatch = text.match(/texto\s+(.+)$/i);
  const relativeMatch = text.match(/daqui\s+a\s+(\d+)\s*(min|minutos|hora|horas)/i);

  let date = dateMatch?.[1] || null;
  let time = timeMatch?.[1] || null;
  const message =
    messageMatch?.[1]?.trim() ||
    messageInlineMatch?.[1]?.trim() ||
    messageEscritoMatch?.[1]?.trim() ||
    messageTextoMatch?.[1]?.trim() ||
    null;

  if ((!date || !time) && relativeMatch) {
    const amount = Number(relativeMatch[1]);
    const unit = relativeMatch[2].toLowerCase();
    if (!Number.isNaN(amount) && amount > 0) {
      const now = new Date();
      const minutes = unit.startsWith('hora') ? amount * 60 : amount;
      const target = new Date(now.getTime() + minutes * 60 * 1000);
      const pad = (value: number) => String(value).padStart(2, '0');
      date = `${pad(target.getDate())}/${pad(target.getMonth() + 1)}/${target.getFullYear()}`;
      time = `${pad(target.getHours())}:${pad(target.getMinutes())}`;
    }
  }

  if (!date || !time || !message) return null;
  return { date, time, message };
}

function parsePublicationRequest(text: string) {
  const normalized = normalizeText(text);
  const typeMatch = normalized.match(/tipo\s*[:\-]?\s*(photo|video)/i);
  const titleMatch = text.match(/titulo\s*[:\-]?\s*(.+?)(?:\s+url\s*[:\-]|\s+data\s*[:\-]|\s+hora\s*[:\-]|$)/i);
  const urlMatch = text.match(/url\s*[:\-]?\s*(https?:\/\/\S+)/i);
  const publishAtMatch = text.match(/publishat\s*[:\-]?\s*(\S+)/i);
  const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);
  const timeMatch = text.match(/\b(\d{2}:\d{2})\b/);

  let publishAt = publishAtMatch?.[1] || null;
  if (!publishAt && dateMatch?.[1] && timeMatch?.[1]) {
    const [day, month, year] = dateMatch[1].split('/');
    publishAt = `${year}-${month}-${day}T${timeMatch[1]}:00.000Z`;
  }

  const type = typeMatch?.[1] || null;
  const title = titleMatch?.[1]?.trim() || null;
  const url = urlMatch?.[1]?.trim() || null;

  if (!type || !title || !url || !publishAt) return null;

  return { type, title, url, publishAt };
}

function handleCommand(text: string): Message | null {
  const normalized = normalizeText(text);

  const isHelp = normalized.startsWith('/ajuda') || containsAny(normalized, [
    'ajuda',
    'comandos',
    'o que voce faz',
    'o que você faz',
    'como funciona'
  ]);

  const isStatus = normalized.startsWith('/status') || containsAny(normalized, [
    'status',
    'esta online',
    'está online',
    'ta online',
    'está funcionando'
  ]);

  const isHuman = normalized.startsWith('/humano') || containsAny(normalized, [
    'humano',
    'atendente',
    'suporte',
    'falar com alguem',
    'falar com alguém',
    'atendimento humano'
  ]);

  const isTickets = normalized.startsWith('/tickets') || containsAny(normalized, [
    'ticket',
    'chamado',
    'incidente',
    'abrir ticket',
    'abrir chamado'
  ]);

  const isMicroservices = normalized.startsWith('/microservicos') || containsAny(normalized, [
    'microservico',
    'microservicos',
    'microserviços',
    'servicos',
    'serviços',
    'automatizar'
  ]);

  const scheduleIntent = containsAny(normalized, [
    'agendar mensagem',
    'enviar mensagem',
    'mensagem automatica',
    'mensagem automática',
    'agendar comunicacao',
    'agendar comunicação'
  ]);

  const schedulePayload = scheduleIntent ? parseScheduleRequest(text) : null;

  if (!normalized.startsWith('/') && !isHelp && !isStatus && !isHuman && !isTickets && !isMicroservices && !scheduleIntent) {
    return null;
  }

  if (isHelp) {
    return {
      id: uniqueId('assistant'),
      role: 'assistant',
      timestamp: new Date().toISOString(),
      text: `Comandos disponíveis:\n${COMMANDS.join(', ')}\n\nVocê também pode falar naturalmente, por exemplo: "quero falar com um humano" ou "me mostre os microserviços".`
    };
  }

  if (isStatus) {
    return {
      id: uniqueId('assistant'),
      role: 'assistant',
      timestamp: new Date().toISOString(),
      text: 'Status: pronto para receber comandos, integrações e solicitações humanas.'
    };
  }

  if (isHuman) {
    return {
      id: uniqueId('assistant'),
      role: 'assistant',
      timestamp: new Date().toISOString(),
      text: 'Solicitação enviada. Um atendente humano poderá assumir esta conversa.'
    };
  }

  if (isMicroservices) {
    return {
      id: uniqueId('assistant'),
      role: 'assistant',
      timestamp: new Date().toISOString(),
      text: `Microserviços disponíveis:\n${MICROservices.map((item) => `• ${item}`).join('\n')}\n\nInforme qual deseja executar.`
    };
  }

  if (scheduleIntent) {
    if (!schedulePayload) {
      return {
        id: uniqueId('assistant'),
        role: 'assistant',
        timestamp: new Date().toISOString(),
        text: 'Para agendar, envie no formato: agendar mensagem automática para todos os admin no dia DD/MM/AAAA HH:MM escrito | sua mensagem |'
      };
    }

    return {
      id: uniqueId('assistant'),
      role: 'assistant',
      timestamp: new Date().toISOString(),
      text: `Agendamento criado para todos os admins.\nData: ${schedulePayload.date}\nHora: ${schedulePayload.time}\nMensagem: ${schedulePayload.message}`
    };
  }

  if (isTickets) {
    return {
      id: uniqueId('assistant'),
      role: 'assistant',
      timestamp: new Date().toISOString(),
      text: 'Tickets: nenhum aberto. Para criar, descreva a demanda com prioridade.'
    };
  }

  return {
    id: uniqueId('assistant'),
    role: 'assistant',
    timestamp: new Date().toISOString(),
    text: 'Comando não reconhecido. Use /ajuda para ver opções.'
  };
}

export default function CentralAssistantWidget({ isOpen, onClose }: CentralAssistantWidgetProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([buildSystemMessage()]);
  const [input, setInput] = useState('');
  const [pendingSchedule, setPendingSchedule] = useState<PendingSchedule | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [modelTier, setModelTier] = useState<ModelTier>('fast');
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sortedMessages = useMemo(() => messages, [messages]);

  const getAdminAuthHeaders = async (): Promise<Record<string, string>> => {
    const user = getAuth().currentUser;
    if (!user) return {};
    const idToken = await user.getIdToken();
    return { Authorization: `Bearer ${idToken}` };
  };

  if (!isOpen) return null;

  const uploadMedia = async (file: File) => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast({ variant: 'destructive', title: 'Arquivo inválido', description: 'Envie apenas imagens ou vídeos.' });
      return;
    }

    const maxSize = file.type.startsWith('image/') ? 10 * 1024 * 1024 : 200 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        variant: 'destructive',
        title: 'Arquivo muito grande',
        description: file.type.startsWith('image/')
          ? 'Imagens devem ter no máximo 10MB.'
          : 'Vídeos devem ter no máximo 200MB.'
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'assistant-media');
      formData.append('type', 'assistant-media');
      formData.append('title', file.name);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: await getAdminAuthHeaders(),
        body: formData,
      });

      const data = await response.json();
      if (!response.ok || !data?.success || !data?.url) {
        throw new Error(data?.message || 'Falha ao enviar mídia.');
      }

      const mediaItem: MediaItem = {
        id: uniqueId('media'),
        url: data.url,
        kind: file.type.startsWith('video/') ? 'video' : 'image',
        fileName: file.name,
        storageType: data.storageType,
        title: file.name,
      };

      setMessages((prev) => [
        ...prev,
        {
          id: uniqueId('assistant-media'),
          role: 'assistant',
          timestamp: new Date().toISOString(),
          text: 'Mídia armazenada. Escolha um destino abaixo.',
          media: mediaItem,
        },
      ]);

      toast({ title: 'Mídia armazenada', description: 'Arquivo pronto para enviar ou publicar.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro no upload', description: error?.message || 'Falha ao enviar mídia.' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendToUser = async (media: MediaItem) => {
    const chatId = window.prompt('Informe o ID do chat do usuário para enviar esta mídia:');
    if (!chatId) return;

    const customText = window.prompt('Mensagem opcional (deixe em branco para enviar apenas a mídia):') || '';
    const messageText = customText.trim() || (media.kind === 'video' ? '🎥 Vídeo' : '📷 Imagem');

    try {
      const chatRef = doc(db, 'chats', chatId);
      await setDoc(chatRef, { updatedAt: serverTimestamp() }, { merge: true });

      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const mediaPayload: Record<string, any> = {
        text: messageText,
        senderId: 'admin',
        timestamp: serverTimestamp(),
      };
      if (media.kind === 'image') {
        mediaPayload.imageUrl = media.url;
      }
      if (media.kind === 'video') {
        mediaPayload.videoUrl = media.url;
      }

      await addDoc(messagesRef, mediaPayload);

      await updateDoc(chatRef, {
        lastMessage: mediaPayload,
      });

      toast({ title: 'Mídia enviada', description: `Enviada para o chat ${chatId}.` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao enviar', description: error?.message || 'Falha ao enviar mídia.' });
    }
  };

  const publishPhoto = async (media: MediaItem) => {
    try {
      const response = await fetch('/api/admin/fotos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: media.title,
          description: media.description || '',
          photoUrl: media.url,
          storageType: media.storageType || 'firebase-storage',
        })
      });
      const data = await response.json();
      if (!response.ok || !data?.success) throw new Error(data?.message || 'Falha ao publicar foto.');
      toast({ title: 'Publicado em Fotos', description: 'Foto adicionada com sucesso.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao publicar foto', description: error?.message || 'Falha ao publicar foto.' });
    }
  };

  const publishVideo = async (media: MediaItem) => {
    try {
      const response = await fetch('/api/admin/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: media.title,
          description: media.description || '',
          videoUrl: media.url,
          thumbnailUrl: '',
          storageType: media.storageType || 'firebase-storage',
        })
      });
      const data = await response.json();
      if (!response.ok || !data?.success) throw new Error(data?.message || 'Falha ao publicar vídeo.');
      toast({ title: 'Publicado em Vídeos', description: 'Vídeo adicionado com sucesso.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao publicar vídeo', description: error?.message || 'Falha ao publicar vídeo.' });
    }
  };

  const publishExclusive = async (media: MediaItem) => {
    try {
      const response = await fetch('/api/admin/exclusive-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: media.title,
          description: media.description || '',
          type: media.kind === 'video' ? 'video' : 'photo',
          url: media.url,
          thumbnailUrl: media.url,
          tags: [],
        })
      });
      const data = await response.json();
      if (!response.ok || !data?.success) throw new Error(data?.message || 'Falha ao publicar conteúdo exclusivo.');
      toast({ title: 'Publicado no Conteúdo Exclusivo', description: 'Conteúdo adicionado com sucesso.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao publicar exclusivo', description: error?.message || 'Falha ao publicar conteúdo exclusivo.' });
    }
  };

  const handleVerifyAdminMedia = (media: MediaItem) => {
    const adminUid = getAuth().currentUser?.uid;
    const adminInfo = adminUid ? `AdminUid: ${adminUid}.` : 'AdminUid nao informado.';
    const text = `Verificar admin por foto/video. ${adminInfo} Tipo: ${media.kind}. Arquivo: ${media.fileName}. URL: ${media.url}.`;
    void handleSend(text);
  };

  const createSchedule = async (payload: PendingSchedule): Promise<ScheduleResponse> => {
    try {
      const response = await fetch('/api/admin/scheduled-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          audience: payload.audience,
          date: payload.date,
          time: payload.time,
          message: payload.message
        })
      });

      const data = await response.json();
      if (!response.ok) {
        return { ok: false, error: data?.error || 'Falha ao agendar a mensagem.' };
      }

      return { ok: true, id: data?.id };
    } catch (error) {
      return { ok: false, error: 'Erro de rede ao agendar a mensagem.' };
    }
  };

  const handleSend = async (overrideText?: string) => {
    const rawText = overrideText ?? input;
    const trimmed = rawText.trim();
    if (!trimmed) return;
    const shouldClearInput = overrideText === undefined;

    const normalized = normalizeText(trimmed);
    const publicationIntent = containsAny(normalized, [
      'agendar publicacao',
      'agendar publicação',
      'publicar foto',
      'publicar video',
      'publicar vídeo'
    ]);
    const publicationPayload = publicationIntent ? parsePublicationRequest(trimmed) : null;
    const scheduleIntent = containsAny(normalized, [
      'agendar mensagem',
      'enviar mensagem',
      'mensagem automatica',
      'mensagem automática',
      'agendar comunicacao',
      'agendar comunicação'
    ]);

    // Parseamento de agendamento local
    const schedulePayload = scheduleIntent ? parseScheduleRequest(trimmed) : null;
    const inferredSchedule = scheduleIntent ? null : parseScheduleRequest(trimmed);
    const pendingPayload = pendingSchedule ? parseScheduleRequest(trimmed) : null;

    const userMessage: Message = {
      id: uniqueId('user'),
      role: 'user',
      timestamp: new Date().toISOString(),
      text: trimmed
    };

    if (publicationIntent && !publicationPayload) {
      setMessages((prev) => [
        ...prev,
        userMessage,
        {
          id: uniqueId('assistant'),
          role: 'assistant',
          timestamp: new Date().toISOString(),
          text: 'Para agendar publicação, envie: agendar publicação tipo photo|video titulo: Seu título url: https://... publishAt: 2026-02-01T18:00:00Z (ou informe data DD/MM/AAAA e hora HH:MM).'
        }
      ]);
      if (shouldClearInput) setInput('');
      return;
    }

    // 1. Verificar comandos locais (/ajuda, /status)
    const commandResponse = handleCommand(trimmed);
    if (commandResponse) {
      setMessages((prev) => [...prev, userMessage, commandResponse]);
      if (shouldClearInput) setInput('');
      return;
    }

    // 2. Verificar agendamento local (sistema legado de regex)
    if (scheduleIntent || pendingSchedule || inferredSchedule) {
      let scheduleToCreate: PendingSchedule | null = null;

      setMessages((prev) => {
        const next = [...prev, userMessage];
        const current = pendingSchedule || { audience: 'admins' as const };
        const payload = schedulePayload || inferredSchedule || pendingPayload;
        const updated: PendingSchedule = {
          ...current,
          date: payload?.date || current.date,
          time: payload?.time || current.time,
          message: payload?.message || current.message
        };

        if (updated.date && updated.time && updated.message) {
          next.push({
            id: uniqueId('assistant'),
            role: 'assistant',
            timestamp: new Date().toISOString(),
            text: `Agendamento criado para todos os admins.\nData: ${updated.date}\nHora: ${updated.time}\nMensagem: ${updated.message}`
          });
          scheduleToCreate = updated;
          setPendingSchedule(null);
        } else {
          setPendingSchedule(updated);
          const missing = [
            !updated.date ? 'data (DD/MM/AAAA)' : null,
            !updated.time ? 'hora (HH:MM)' : null,
            !updated.message ? 'mensagem (use |sua mensagem| ou "mensagem: ...")' : null
          ].filter(Boolean).join(', ');

          next.push({
            id: uniqueId('assistant'),
            role: 'assistant',
            timestamp: new Date().toISOString(),
            text: `Para concluir o agendamento, envie: ${missing}.`
          });
        }
        return next;
      });

      if (scheduleToCreate) {
        const result = await createSchedule(scheduleToCreate!); // Non-null assertion, checked above
        setMessages((prev) => [
          ...prev,
          {
            id: uniqueId('assistant'),
            role: 'assistant',
            timestamp: new Date().toISOString(),
            text: result.ok
              ? `✅ Agendamento registrado com sucesso${result.id ? ` (ID: ${result.id})` : ''}.`
              : `❌ Não foi possível registrar o agendamento. ${result.error || ''}`.trim()
          }
        ]);
      }
      if (shouldClearInput) setInput('');
      return;
    }

    // 3. Processamento via Cérebro Central (IA)
    let textToSend = trimmed;
    if (publicationPayload) {
      textToSend = `Agendar publicação com dados: ${JSON.stringify(publicationPayload)}`;
    }
    const confirmation = findLastAssistantConfirmation(messages);
    const isAffirmative = isAffirmativeResponse(trimmed);
    const isNegative = isNegativeResponse(trimmed);

    if (confirmation && (isAffirmative || isNegative)) {
      const previousUserMessage = messages
        .slice(0, confirmation.index)
        .reverse()
        .find((msg) => msg.role === 'user');

      const confirmationLabel = isAffirmative ? 'sim' : 'não';
      const contextSummary = previousUserMessage?.text || confirmation.message.text;
      textToSend = `Confirmação: ${confirmationLabel}. Solicitação anterior: ${contextSummary}`;
    }

    // Mapeamento de seleção numérica (1, 2, 3...)
    if (/^\d+$/.test(trimmed)) {
      const idx = Number(trimmed) - 1;
      if (Number.isFinite(idx) && idx >= 0 && idx < MICROservices.length) {
        textToSend = `Executar microserviço: ${MICROservices[idx]}`;
      }
    }

    const loadingId = uniqueId('loading');

    setMessages((prev) => [
      ...prev,
      userMessage,
      {
        id: loadingId,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        text: '...' // Indicador de "digitando"
      }
    ]);
    if (shouldClearInput) setInput('');

    try {
      const authHeaders = await getAdminAuthHeaders();
      const clientRequestId = uniqueId('central');
      console.debug('[Cérebro Central][UI] Enviando mensagem', {
        clientRequestId,
        messageLength: textToSend.length,
        hasAuthHeader: Boolean(authHeaders.Authorization)
      });

      const history = messages
        .filter((msg) => msg.role !== 'system')
        .slice(-6)
        .map((msg) => ({ role: msg.role, text: msg.text, timestamp: msg.timestamp }));

      const response = await fetch('/api/admin/central-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        credentials: 'include',
        body: JSON.stringify({
          message: textToSend,
          clientRequestId,
          options: {
            modelTier,
            tools: {
              webSearch: webSearchEnabled,
            },
          },
          context: {
            history,
          }
        }),
      });

      const data = await response.json();

      console.debug('[Cérebro Central][UI] Resposta recebida', {
        clientRequestId,
        status: response.status,
        ok: response.ok,
        success: data?.success,
        message: data?.message,
        requestId: data?.requestId
      });

      setMessages((prev) => {
        const filtered = prev.filter(m => m.id !== loadingId);
        if (data.success && data.data) {
          const rawText = data.data.text ?? data.data.message ?? data.data.result;
          const safeText = extractAssistantText(rawText ?? data.data);
          const normalized = {
            ...data.data,
            id: data.data.id || uniqueId('assistant'),
            text: safeText
          };
          return [...filtered, normalized];
        } else {
          return [...filtered, {
            id: uniqueId('error'),
            role: 'assistant',
            timestamp: new Date().toISOString(),
            text: 'Desculpe, tive um erro ao processar sua solicitação no Cérebro Central.'
          }];
        }
      });
    } catch (error) {
      console.error('[Cérebro Central][UI] Erro ao enviar mensagem', error);
      setMessages((prev) => prev.filter(m => m.id !== loadingId));
      toast({ variant: 'destructive', title: 'Erro de conexão', description: 'Não foi possível conectar ao Cérebro Central.' });
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <Card className="w-[360px] h-[500px] max-w-md flex flex-col animate-in fade-in-0 zoom-in-95 duration-500 border border-white/20 bg-white/10 backdrop-blur-[24px] shadow-[0_25px_60px_rgba(0,0,0,0.45)] md:rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between border-b border-white/20 bg-white/10">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-white" />
            <CardTitle className="text-xl text-white">CÉREBRO CENTRAL</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowTools((prev) => !prev)}
              className="text-white hover:bg-white/10 h-8 w-8"
              aria-label="Ferramentas do Cérebro Central"
            >
              <Wrench className="h-4 w-4" />
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/10 h-8 w-8"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {showTools && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-xs text-white/80">Modo</span>
                  <div className="mt-2 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={modelTier === 'fast' ? 'default' : 'outline'}
                      className={cn(
                        'h-8',
                        modelTier === 'fast'
                          ? 'bg-white text-black hover:bg-white/90'
                          : 'border-white/20 text-white hover:bg-white/10'
                      )}
                      onClick={() => setModelTier('fast')}
                    >
                      Rápido
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={modelTier === 'high' ? 'default' : 'outline'}
                      className={cn(
                        'h-8',
                        modelTier === 'high'
                          ? 'bg-white text-black hover:bg-white/90'
                          : 'border-white/20 text-white hover:bg-white/10'
                      )}
                      onClick={() => setModelTier('high')}
                    >
                      Profundo
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-end">
                    <Label className="text-xs text-white/80" htmlFor="cc-web-search">
                      Web Search
                    </Label>
                    <span className="text-[10px] text-white/50">Requer chaves no servidor</span>
                  </div>
                  <Switch
                    id="cc-web-search"
                    checked={webSearchEnabled}
                    onCheckedChange={(checked) => setWebSearchEnabled(Boolean(checked))}
                  />
                </div>
              </div>
            </div>
          )}
          {sortedMessages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex items-start gap-2",
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {msg.role !== 'user' && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                  {msg.role === 'system' ? (
                    <Wrench className="h-4 w-4 text-white" />
                  ) : (
                    <Bot className="h-4 w-4 text-white" />
                  )}
                </div>
              )}
              <div
                className={cn(
                  "max-w-xs md:max-w-md rounded-lg px-3 py-2 text-sm",
                  msg.role === 'user'
                    ? 'bg-white/30 text-white rounded-br-sm border border-white/20'
                    : 'bg-white/20 text-white rounded-bl-sm border border-white/15'
                )}
                style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
              >
                {formatMessageText(msg.text)}
                {msg.media && (
                  <div className="mt-3 space-y-2">
                    <div className="rounded-md border border-white/10 bg-black/20 p-2">
                      {msg.media.kind === 'image' ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={msg.media.url}
                          alt={msg.media.fileName}
                          className="h-40 w-full rounded object-cover"
                        />
                      ) : (
                        <video
                          src={msg.media.url}
                          controls
                          className="h-40 w-full rounded object-cover"
                        />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10"
                        onClick={() => handleSendToUser(msg.media!)}
                      >
                        Enviar ao usuário
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10"
                        onClick={() => handleVerifyAdminMedia(msg.media!)}
                      >
                        Verificar admin (IA)
                      </Button>
                      {msg.media.kind === 'image' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/20 text-white hover:bg-white/10"
                          onClick={() => publishPhoto(msg.media!)}
                        >
                          Publicar em Fotos
                        </Button>
                      )}
                      {msg.media.kind === 'video' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/20 text-white hover:bg-white/10"
                          onClick={() => publishVideo(msg.media!)}
                        >
                          Publicar em Vídeos
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10"
                        onClick={() => publishExclusive(msg.media!)}
                      >
                        Conteúdo Exclusivo
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                  <User className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
          ))}
        </CardContent>
        <CardFooter className="border-t border-white/20 bg-white/5 p-2.5 flex flex-col items-start gap-2">
          <div className="flex w-full items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadMedia(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 border-white/20 text-white hover:bg-white/10"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <span className="text-xs">...</span>
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
            </Button>
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Digite um comando ou mensagem..."
              className="min-h-[48px] max-h-[120px] resize-none bg-white/10 border-white/20 text-white placeholder-white/50 focus-visible:ring-white/30"
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button
              onClick={() => handleSend()}
              size="icon"
              className="h-10 w-10 bg-white/20 text-white hover:bg-white/30"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {COMMANDS.map((cmd) => (
              <button
                key={cmd}
                type="button"
                className="text-xs px-2 py-1 rounded-full border border-white/20 text-white/80 hover:text-white hover:border-white/40 transition"
                onClick={() => setInput(cmd)}
              >
                {cmd}
              </button>
            ))}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
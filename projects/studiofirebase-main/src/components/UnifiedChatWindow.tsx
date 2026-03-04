"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { auth, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { MapPin, Paperclip, Image as ImageIcon, Video, Loader2 } from 'lucide-react';
import {
  CHAT_CHANNELS,
  CHANNEL_FILTER_OPTIONS,
  getChannelColor,
  type ChatChannel
} from '@/lib/chat-constants';
import { SocialConnectionsStatus } from '@/components/admin/social-connections-status';

interface Participant {
  id: string;
  name: string;
  type?: string;
  email?: string | null;
  metadata?: { uid?: string | null } | null;
}

interface Message {
  id: string;
  channel?: ChatChannel;
  sender: string;
  text?: string;
  timestamp?: any;
}

interface Conversation {
  id: string;
  channel: ChatChannel;
  participant: Participant;
  unreadCount?: number;
  lastMessage?: Message | null;
}

export default function UnifiedChatWindow() {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [filter, setFilter] = useState<ChatChannel>(CHAT_CHANNELS.ALL);
  const [channelStatus, setChannelStatus] = useState<Partial<Record<ChatChannel, boolean>>>({});
  const [channelStatusLoading, setChannelStatusLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [conversationSettings, setConversationSettings] = useState({
    autoReplyEnabled: false,
    replyTone: 'humanized' as 'humanized' | 'robotic'
  });
  const lastLoadedConversationIdRef = useRef<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter to show Site, Facebook and Instagram channels
  const CHANNELS = useMemo(() => CHANNEL_FILTER_OPTIONS.filter(
    (item) => item.key === CHAT_CHANNELS.ALL || 
              item.key === CHAT_CHANNELS.SITE ||
              item.key === CHAT_CHANNELS.FACEBOOK || 
              item.key === CHAT_CHANNELS.INSTAGRAM
  ), []);
  const filteredConversations = useMemo(
    () => (filter === CHAT_CHANNELS.ALL ? conversations : conversations.filter((item) => item.channel === filter)),
    [conversations, filter]
  );

  const channelBadge = useCallback((channel: ChatChannel) => getChannelColor(channel), []);
  const channelConfigured = useCallback((channel: ChatChannel) => {
    if (channel === CHAT_CHANNELS.ALL || channel === CHAT_CHANNELS.SITE) return true;
    if (channelStatusLoading) return true;
    const status = channelStatus[channel];
    return typeof status === 'boolean' ? status : true;
  }, [channelStatus, channelStatusLoading]);
  const filterConfigured = channelConfigured(filter);

  const normalizeMessage = useCallback((message: any): Message => {
    return {
      id: message?.id || message?._id || `${message?.timestamp || Date.now()}`,
      channel: message?.channel || undefined,
      sender: message?.sender || message?.from || 'user',
      text: message?.text || message?.body || message?.message || '',
      timestamp: message?.timestamp || message?.createdAt || null
    };
  }, []);

  const renderMessageContent = (message: Message) => message.text || '';

  const getAuthHeaders = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return {} as Record<string, string>;
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` } as Record<string, string>;
  }, []);

  const fetchChannelStatus = useCallback(async () => {
    setChannelStatusLoading(true);
    try {
      const headers = await getAuthHeaders();
      if (!headers?.Authorization) {
        setChannelStatusLoading(false);
        return;
      }

      const response = await fetch('/api/admin/integrations/status?services=whatsapp,facebook,instagram,twitter', {
        headers,
        credentials: 'include'
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || 'Falha ao carregar status dos canais');
      }

      const status = data.status || {};
      const parseStatus = (value: any) => {
        if (value && typeof value === 'object') return Boolean(value.connected);
        return Boolean(value);
      };

      setChannelStatus({
        [CHAT_CHANNELS.WHATSAPP]: parseStatus(status.whatsapp),
        [CHAT_CHANNELS.FACEBOOK]: parseStatus(status.facebook),
        [CHAT_CHANNELS.INSTAGRAM]: parseStatus(status.instagram),
        [CHAT_CHANNELS.TWITTER]: parseStatus(status.twitter)
      });
    } catch (error) {
      console.warn('[UnifiedChatWindow] Falha ao buscar status de canais:', error);
    } finally {
      setChannelStatusLoading(false);
    }
  }, [getAuthHeaders]);

  const fetchConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      if (filter && filter !== CHAT_CHANNELS.ALL) {
        params.set('channel', filter);
      }
      const response = await fetch(`/api/messages/conversations?${params.toString()}`, {
        headers,
        credentials: 'include'
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Falha ao carregar conversas');
      }
      const normalized = (data.conversations || []).map((conversation: any) => {
        const participant: Participant = conversation?.participant?.id
          ? conversation.participant
          : {
            id: conversation?.participant?.id || conversation?.id || 'unknown',
            name: conversation?.participant?.name || conversation?.id || 'Participante',
            type: conversation?.participant?.type || 'user',
            email: conversation?.participant?.email || null,
            metadata: conversation?.participant?.metadata || null
          };

        const lastMessage = conversation?.lastMessage ? normalizeMessage(conversation.lastMessage) : null;

        return {
          ...conversation,
          channel: conversation?.channel || CHAT_CHANNELS.SITE,
          participant,
          lastMessage
        } as Conversation;
      });
      setConversations(normalized);
      if (normalized.length) {
        setSelected((current) => current ?? normalized[0]);
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao carregar conversas', description: error?.message || 'Falha no servidor.' });
    } finally {
      setLoadingConversations(false);
    }
  }, [filter, getAuthHeaders, normalizeMessage, toast]);

  const fetchMessages = useCallback(async (conversation: Conversation) => {
    if (!conversation?.participant?.id || conversation.participant.id === 'undefined') {
      return;
    }

    try {
      const isInitialLoad = lastLoadedConversationIdRef.current !== conversation.id;
      if (isInitialLoad) {
        setLoadingMessages(true);
      }
      const headers = await getAuthHeaders();
      const params = new URLSearchParams({
        channel: conversation.channel,
        participantId: conversation.participant.id,
        conversationId: conversation.id,
      });
      const response = await fetch(`/api/messages?${params.toString()}`, {
        headers,
        credentials: 'include'
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Falha ao carregar mensagens');
      }
      const normalizedMessages = (data.messages || []).map((message: Message) => normalizeMessage(message));
      setMessages(normalizedMessages);
      lastLoadedConversationIdRef.current = conversation.id;
    } catch (error: any) {
      const isBackgroundRefresh = lastLoadedConversationIdRef.current === conversation.id;
      if (!isBackgroundRefresh) {
        toast({ variant: 'destructive', title: 'Erro ao carregar mensagens', description: error?.message || 'Falha no servidor.' });
      }
    } finally {
      setLoadingMessages(false);
    }
  }, [getAuthHeaders, normalizeMessage, toast]);

  const fetchConversationSettings = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      if (!headers?.Authorization) {
        setSettingsLoading(false);
        return;
      }

      const response = await fetch('/api/admin/conversation-settings', {
        headers,
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Falha ao carregar configurações de conversa');
      }

      const settings = data?.settings || {};
      setConversationSettings({
        autoReplyEnabled: Boolean(settings.autoReplyEnabled),
        replyTone: settings.replyTone === 'robotic' ? 'robotic' : 'humanized',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar automação',
        description: error?.message || 'Falha no servidor.',
      });
    } finally {
      setSettingsLoading(false);
    }
  }, [getAuthHeaders, toast]);

  const saveConversationSettings = useCallback(async (next: { autoReplyEnabled: boolean; replyTone: 'humanized' | 'robotic' }) => {
    setSettingsSaving(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/admin/conversation-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        credentials: 'include',
        body: JSON.stringify(next),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Falha ao salvar configurações');
      }
      setConversationSettings({
        autoReplyEnabled: Boolean(data.settings?.autoReplyEnabled),
        replyTone: data.settings?.replyTone === 'robotic' ? 'robotic' : 'humanized',
      });
      toast({
        title: 'Configurações atualizadas',
        description: 'Automação de resposta atualizada com sucesso.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar automação',
        description: error?.message || 'Falha no servidor.',
      });
    } finally {
      setSettingsSaving(false);
    }
  }, [getAuthHeaders, toast]);

  const handleSend = async () => {
    if (!selected || !text.trim()) return;
    setSending(true);

    try {
      const headers = await getAuthHeaders();
      const payload = { participantId: selected.participant.id, message: text.trim() };

      if (selected.channel === CHAT_CHANNELS.SITE) {
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({
            channel: CHAT_CHANNELS.SITE,
            text: text.trim(),
            chatId: selected.participant.id,
            recipientId: selected.participant.id,
          }),
          credentials: 'include'
        });
        const data = await response.json();
        if (!response.ok || !data?.success) throw new Error(data?.message || 'Falha ao enviar mensagem');
      } else {
        const response = await fetch(`/api/channels/${selected.channel}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify(payload),
          credentials: 'include'
        });
        const data = await response.json();
        if (!response.ok || !data?.success) throw new Error(data?.message || 'Falha ao enviar mensagem');
      }

      setText('');
      await fetchMessages(selected);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao enviar mensagem', description: error?.message || 'Falha no servidor.' });
    } finally {
      setSending(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selected) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `chat-images/${selected.id}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const imageUrl = await getDownloadURL(storageRef);

      const headers = await getAuthHeaders();
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          channel: selected.channel,
          text: '📷 Imagem',
          chatId: selected.participant.id,
          recipientId: selected.participant.id,
          imageUrl
        }),
        credentials: 'include'
      });

      const data = await response.json();
      if (!response.ok || !data?.success) throw new Error(data?.message || 'Falha ao enviar imagem');

      toast({ title: 'Imagem Enviada', description: 'Sua imagem foi enviada com sucesso.' });
      await fetchMessages(selected);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao enviar imagem', description: error?.message || 'Falha no upload.' });
    } finally {
      setIsUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selected) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `chat-videos/${selected.id}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const videoUrl = await getDownloadURL(storageRef);

      const headers = await getAuthHeaders();
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          channel: selected.channel,
          text: '🎥 Vídeo',
          chatId: selected.participant.id,
          recipientId: selected.participant.id,
          videoUrl
        }),
        credentials: 'include'
      });

      const data = await response.json();
      if (!response.ok || !data?.success) throw new Error(data?.message || 'Falha ao enviar vídeo');

      toast({ title: 'Vídeo Enviado', description: 'Seu vídeo foi enviado com sucesso.' });
      await fetchMessages(selected);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao enviar vídeo', description: error?.message || 'Falha no upload.' });
    } finally {
      setIsUploading(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selected) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `chat-files/${selected.id}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);

      const headers = await getAuthHeaders();
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          channel: selected.channel,
          text: `📎 ${file.name}`,
          chatId: selected.participant.id,
          recipientId: selected.participant.id,
          fileUrl,
          fileName: file.name
        }),
        credentials: 'include'
      });

      const data = await response.json();
      if (!response.ok || !data?.success) throw new Error(data?.message || 'Falha ao enviar arquivo');

      toast({ title: 'Arquivo Enviado', description: 'Seu arquivo foi enviado com sucesso.' });
      await fetchMessages(selected);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao enviar arquivo', description: error?.message || 'Falha no upload.' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendLocation = () => {
    if (!selected) return;

    if (navigator.geolocation) {
      toast({ title: 'Obtendo localização...', description: 'Aguarde um momento...' });

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const headers = await getAuthHeaders();
            const response = await fetch('/api/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...headers },
              body: JSON.stringify({
                channel: selected.channel,
                text: `📍 Localização: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                chatId: selected.participant.id,
                recipientId: selected.participant.id,
                isLocation: true,
                latitude,
                longitude
              }),
              credentials: 'include'
            });

            const data = await response.json();
            if (!response.ok || !data?.success) throw new Error(data?.message || 'Falha ao enviar localização');

            toast({ title: 'Localização enviada!', description: 'Sua localização foi compartilhada com sucesso.' });
            await fetchMessages(selected);
          } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro ao enviar localização', description: error?.message || 'Falha ao enviar.' });
          }
        },
        (error) => {
          let errorMessage = 'Erro ao obter localização';
          if (error.code === error.PERMISSION_DENIED) {
            errorMessage = 'Permissão negativa';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMessage = 'Localização indisponível';
          } else if (error.code === error.TIMEOUT) {
            errorMessage = 'Tempo esgotado';
          }
          toast({ variant: 'destructive', title: errorMessage, description: 'Verifique as permissões de localização.' });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    } else {
      toast({ variant: 'destructive', title: 'Geolocalização não suportada', description: 'Seu navegador não suporta geolocalização.' });
    }
  };

  useEffect(() => {
    void fetchConversations();
    const interval = setInterval(() => void fetchConversations(), 10_000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  useEffect(() => {
    void fetchConversationSettings();
  }, [fetchConversationSettings]);

  useEffect(() => {
    void fetchChannelStatus();
  }, [fetchChannelStatus]);

  useEffect(() => {
    if (!selected) return;
    void fetchMessages(selected);
    const interval = setInterval(() => void fetchMessages(selected), 3_000);
    return () => clearInterval(interval);
  }, [fetchMessages, selected]);

  return (
    <div className="space-y-4">
      {/* Social Networks Status */}
      <SocialConnectionsStatus />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Conversas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Tabs value={filter} onValueChange={(value) => setFilter(value as ChatChannel)}>
              <TabsList className="flex flex-wrap gap-1">
                {CHANNELS.map((item) => {
                  const isConfigured = channelConfigured(item.key);
                  const showStatus = !channelStatusLoading
                    && item.key !== CHAT_CHANNELS.ALL
                    && item.key !== CHAT_CHANNELS.SITE;

                  return (
                    <TabsTrigger key={item.key} value={item.key} className="text-xs">
                      <span>{item.label}</span>
                      {showStatus && !isConfigured ? (
                        <span className="ml-2 text-[10px] text-muted-foreground">nao conectado</span>
                      ) : null}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              <TabsContent value={filter}>
                <div className="space-y-2">
                  {loadingConversations ? (
                    <div className="text-sm text-muted-foreground">Carregando...</div>
                  ) : !filterConfigured ? (
                    <div className="text-sm text-muted-foreground">Canal nao conectado. Conecte em Integracoes.</div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Nenhuma conversa encontrada.</div>
                  ) : (
                    filteredConversations.map((conversation) => (
                      <button
                        key={conversation.id}
                        className={cn(
                          'w-full rounded-md border border-border p-3 text-left transition hover:bg-muted',
                          selected?.id === conversation.id ? 'bg-muted' : 'bg-transparent'
                        )}
                        onClick={() => setSelected(conversation)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm truncate">{conversation.participant.name}</span>
                          {conversation.unreadCount && conversation.unreadCount > 0 && (
                            <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                              {conversation.unreadCount}
                            </span>
                          )}
                        </div>
                        {(conversation.participant.email || conversation.participant.metadata?.uid) && (
                          <div className="mt-1 text-[11px] text-muted-foreground truncate">
                            {conversation.participant.email || conversation.participant.metadata?.uid}
                          </div>
                        )}
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span className={cn('rounded-full px-2 py-0.5', channelBadge(conversation.channel))}>
                            {conversation.channel}
                          </span>
                          <span className="truncate">
                            {conversation.lastMessage?.text || 'Sem mensagens'}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Mensagens</CardTitle>
            {selected && (
              <div className="text-xs text-muted-foreground">
                {selected.participant.email ? `Email: ${selected.participant.email}` : null}
                {selected.participant.metadata?.uid ? ` • UID: ${selected.participant.metadata.uid}` : null}
              </div>
            )}
          </CardHeader>
          <CardContent className="flex h-[520px] flex-col">
            {!selected ? (
              <div className="text-sm text-muted-foreground">Selecione uma conversa para ver as mensagens.</div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                  {loadingMessages ? (
                    <div className="text-sm text-muted-foreground">Carregando mensagens...</div>
                  ) : messages.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</div>
                  ) : (
                    messages.map((msg) => {
                      const isAdmin = msg.sender === 'admin';
                      return (
                        <div key={msg.id} className={cn('flex', isAdmin ? 'justify-end' : 'justify-start')}>
                          <div className={cn(
                            'max-w-[75%] rounded-lg px-3 py-2 text-sm',
                            isAdmin ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                          )}>
                            {renderMessageContent(msg)}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                    />
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={handleVideoUpload}
                      disabled={isUploading}
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={isUploading}
                      title="Enviar Imagem"
                    >
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => videoInputRef.current?.click()}
                      disabled={isUploading}
                      title="Enviar Vídeo"
                    >
                      <Video className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      title="Enviar Arquivo"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleSendLocation}
                      disabled={isUploading}
                      title="Enviar Localização"
                    >
                      <MapPin className="h-4 w-4" />
                    </Button>
                  </div>
                  {isUploading && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Enviando arquivo...
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <Textarea
                      value={text}
                      onChange={(event) => setText(event.target.value)}
                      className="min-h-[60px]"
                      placeholder="Digite sua mensagem..."
                    />
                    <Button onClick={handleSend} disabled={sending || !text.trim()}>
                      Enviar
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

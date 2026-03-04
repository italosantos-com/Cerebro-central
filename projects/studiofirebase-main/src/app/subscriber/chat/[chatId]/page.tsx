"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import UnlockPaymentOptionsModal from '@/components/unlock-payment-options-modal';
import { getChargeAmountFromMessage } from '@/lib/chat-charge';

interface Message {
  id: string;
  text?: string;
  imageUrl?: string;
  videoUrl?: string;
  senderId: string;
  senderName?: string;
  timestamp: any;
  isCharge?: boolean;
  chargeAmount?: number;
  hasLockedMedia?: boolean;
  lockedMediaUrl?: string;
  lockedMediaType?: 'image' | 'video' | 'file';
  lockedMediaName?: string;
}

export default function SubscriberChatPage() {
  const params = useParams();
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const chatId = Array.isArray(params?.chatId) ? params.chatId[0] : (params?.chatId ?? '');
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [unlockTarget, setUnlockTarget] = useState<Message | null>(null);
  const [unlockedMessageIds, setUnlockedMessageIds] = useState<Set<string>>(new Set());
  const [chatInfo, setChatInfo] = useState<{ 
    adminUid?: string;
    adminUsername?: string; 
    userDisplayName?: string;
    adminPhotoURL?: string;
    userPhotoURL?: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch chat info
  useEffect(() => {
    const fetchChatInfo = async () => {
      if (!chatId) return;

      try {
        const chatRef = doc(db, 'chats', chatId);
        const chatSnap = await getDoc(chatRef);
        
        if (chatSnap.exists()) {
          const data = chatSnap.data();
          let profilePictureUrl: string | undefined;

          if (data.adminUid) {
            try {
              const profileSettingsSnap = await getDoc(doc(db, 'admins', data.adminUid, 'profile', 'settings'));
              if (profileSettingsSnap.exists()) {
                const profileData = profileSettingsSnap.data() as { profilePictureUrl?: string };
                profilePictureUrl = profileData.profilePictureUrl;
              }
            } catch {
              // fallback silencioso
            }
          }

          setChatInfo({
            adminUid: data.adminUid,
            adminUsername: data.adminUsername,
            userDisplayName: data.userDisplayName,
            adminPhotoURL: data.adminPhotoURL || profilePictureUrl,
            userPhotoURL: data.userPhotoURL,
          });
        }
      } catch (error) {
        console.error('Error fetching chat info:', error);
      }
    };

    fetchChatInfo();
  }, [chatId]);

  // Listen to messages
  useEffect(() => {
    if (!chatId || !user) {
      setIsLoading(false);
      return;
    }

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((docSnap) => {
        msgs.push({ id: docSnap.id, ...docSnap.data() } as Message);
      });
      setMessages(msgs);
      setIsLoading(false);
    }, (error) => {
      console.error('Error loading messages:', error);
      toast.error('Erro ao carregar mensagens');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [chatId, user]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage || isSending || !user || !chatId) {
      return;
    }

    setIsSending(true);
    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      
      await addDoc(messagesRef, {
        text: trimmedMessage,
        senderId: user.uid,
        senderName: userProfile?.displayName || user.displayName || 'Você',
        timestamp: serverTimestamp(),
        read: false,
      });

      // Update chat's lastActivity
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        lastActivity: serverTimestamp(),
        lastMessage: {
          text: trimmedMessage,
          timestamp: serverTimestamp(),
        },
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setIsSending(false);
    }
  };

  const isMyMessage = (message: Message): boolean => {
    return message.senderId === user?.uid;
  };

  const isMessageUnlocked = (messageId: string): boolean => unlockedMessageIds.has(messageId);
  const getMessageChargeAmount = (message: Message): number | null => getChargeAmountFromMessage(message);

  const getTrustedMediaUrl = (value?: string): string | null => {
    if (!value) return null;
    try {
      const parsed = new URL(value);
      const isSecure = parsed.protocol === 'https:';
      const isLocalDevHttp = parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1');
      if (isSecure || isLocalDevHttp) {
        return value;
      }
    } catch {
      return null;
    }
    return null;
  };

  const formatTime = (timestamp: any): string => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">Você precisa estar logado para acessar o chat</p>
            <Button className="mt-4" onClick={() => router.push('/login')}>
              Fazer Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 px-4 max-w-4xl min-h-screen flex flex-col">
      <div className="mb-4">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => router.push('/perfil')}
          className="mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Perfil
        </Button>
      </div>

      <Card className="flex-1 flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage 
                src={chatInfo?.adminPhotoURL || chatInfo?.userPhotoURL || ''} 
                alt={chatInfo?.adminUsername || 'Chat'} 
              />
              <AvatarFallback>
                {(chatInfo?.adminUsername || chatInfo?.userDisplayName || 'C').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <CardTitle className="text-lg">
              {chatInfo?.adminUsername || chatInfo?.userDisplayName || 'Conversa'}
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4" style={{ maxHeight: 'calc(100vh - 300px)' }}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Nenhuma mensagem ainda. Seja o primeiro a escrever!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const isMine = isMyMessage(message);
                const trustedLockedMediaUrl = getTrustedMediaUrl(message.lockedMediaUrl);
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        isMine
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {!isMine && message.senderName && (
                        <p className="text-xs font-semibold mb-1 opacity-70">
                          {message.senderName}
                        </p>
                      )}
                      
                      {message.text && <p className="break-words">{message.text}</p>}

                      {message.isCharge && message.hasLockedMedia && (
                        <div className="mt-2 rounded-md border p-2 space-y-2">
                          {!isMessageUnlocked(message.id) ? (
                            <>
                              <p className="text-xs font-medium"><span aria-hidden="true">🔒</span> Mídia bloqueada</p>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  if (!getMessageChargeAmount(message)) {
                                    toast.error('Não foi possível identificar o valor da cobrança.');
                                    return;
                                  }
                                  setUnlockTarget(message);
                                }}
                              >
                                Desbloquear
                              </Button>
                            </>
                          ) : (
                            <>
                              <p className="text-xs font-medium text-emerald-600"><span aria-hidden="true">✅</span> Mídia desbloqueada</p>
                              {message.lockedMediaType === 'image' && trustedLockedMediaUrl && (
                                <img
                                  src={trustedLockedMediaUrl}
                                  alt={message.lockedMediaName || 'Imagem desbloqueada da cobrança'}
                                  className="rounded max-w-full"
                                />
                              )}
                              {message.lockedMediaType === 'video' && trustedLockedMediaUrl && (
                                <video
                                  src={trustedLockedMediaUrl}
                                  controls
                                  className="rounded max-w-full"
                                />
                              )}
                              {message.lockedMediaType === 'file' && trustedLockedMediaUrl && (
                                <a
                                  href={trustedLockedMediaUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm underline"
                                >
                                  {message.lockedMediaName || 'Abrir arquivo desbloqueado'}
                                </a>
                              )}
                            </>
                          )}
                        </div>
                      )}
                      
                      {message.imageUrl && (
                        <img 
                          src={message.imageUrl} 
                          alt="Imagem" 
                          className="rounded mt-2 max-w-full"
                        />
                      )}
                      
                      {message.videoUrl && (
                        <video 
                          src={message.videoUrl} 
                          controls 
                          className="rounded mt-2 max-w-full"
                        />
                      )}
                      
                      <p className={`text-xs mt-1 ${isMine ? 'opacity-70' : 'text-muted-foreground'}`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </CardContent>

        <div className="border-t p-4">
          <form onSubmit={handleSendMessage} className="flex space-x-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              disabled={isSending}
              className="flex-1"
            />
            <Button type="submit" disabled={isSending || !newMessage.trim()}>
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </Card>

      {unlockTarget && (
        <UnlockPaymentOptionsModal
          isOpen={Boolean(unlockTarget)}
          onClose={() => setUnlockTarget(null)}
          amount={getMessageChargeAmount(unlockTarget) || 0}
          currency="BRL"
          symbol="R$"
          title={unlockTarget.lockedMediaName}
          onPaymentSuccess={() => {
            setUnlockedMessageIds((prev) => {
              const next = new Set(prev);
              next.add(unlockTarget.id);
              return next;
            });
            setUnlockTarget(null);
            toast.success('Pagamento confirmado! Mídia desbloqueada.');
          }}
        />
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChatConversation {
  id: string;
  adminUid: string;
  adminUsername?: string;
  userDisplayName?: string;
  userEmail?: string;
  userPhotoURL?: string;
  adminPhotoURL?: string;
  lastMessage?: {
    text?: string;
    imageUrl?: string;
    videoUrl?: string;
    timestamp?: any;
  };
  lastActivity?: any;
  createdAt?: any;
}

interface SubscriberChatListProps {
  userId: string;
  userEmail: string;
}

export default function SubscriberChatList({ userId, userEmail }: SubscriberChatListProps) {
  const router = useRouter();
  const [chats, setChats] = useState<ChatConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const pickAvatar = (...candidates: unknown[]): string | undefined => {
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate;
      }
    }
    return undefined;
  };

  useEffect(() => {
    if (!userId && !userEmail) {
      setIsLoading(false);
      return;
    }

    const chatsRef = collection(db, 'chats');
    const queryDefs = [
      userId ? query(chatsRef, where('userUid', '==', userId), limit(100)) : null,
      userId ? query(chatsRef, where('userId', '==', userId), limit(100)) : null,
      userEmail ? query(chatsRef, where('userEmail', '==', userEmail), limit(100)) : null,
    ].filter(Boolean) as ReturnType<typeof query>[];

    if (queryDefs.length === 0) {
      setIsLoading(false);
      return;
    }

    let completedListeners = 0;
    const mergedById = new Map<string, ChatConversation>();

    const hydrateAndSetChats = async () => {
      const chatList = Array.from(mergedById.values())
        .sort((a, b) => {
          const aDate = (a.lastActivity || a.createdAt) as any;
          const bDate = (b.lastActivity || b.createdAt) as any;

          const aMs = aDate?.toDate ? aDate.toDate().getTime() : new Date(aDate || 0).getTime();
          const bMs = bDate?.toDate ? bDate.toDate().getTime() : new Date(bDate || 0).getTime();

          return bMs - aMs;
        })
        .slice(0, 50);

      const uniqueAdminUids = new Set(
        chatList
          .map((chat) => chat.adminUid)
          .filter((value): value is string => Boolean(value))
      );

      if (uniqueAdminUids.size === 0) {
        setChats(chatList);
        setIsLoading(false);
        return;
      }

      try {
        const adminEntries = await Promise.all(
          Array.from(uniqueAdminUids).map(async (adminUid) => {
            try {
              const [adminSnap, profileSnap] = await Promise.all([
                getDoc(doc(db, 'admins', adminUid)),
                getDoc(doc(db, 'admins', adminUid, 'profile', 'settings')),
              ]);

              const adminData = adminSnap.exists() ? adminSnap.data() : null;
              const profileData = profileSnap.exists() ? profileSnap.data() : null;

              return [
                adminUid,
                {
                  photoURL: pickAvatar(
                    (profileData as any)?.profilePictureUrl,
                    (adminData as any)?.photoURL,
                    (adminData as any)?.profilePictureUrl
                  ),
                  username: (adminData as any)?.publicUsername || (adminData as any)?.username,
                },
              ] as const;
            } catch {
              return [adminUid, { photoURL: undefined, username: undefined }] as const;
            }
          })
        );

        const profilePictureMap = new Map(adminEntries);

        const enriched = chatList.map((chat) => {
          const adminData = profilePictureMap.get(chat.adminUid);
          return {
            ...chat,
            adminPhotoURL: pickAvatar(chat.adminPhotoURL, adminData?.photoURL),
            adminUsername: chat.adminUsername || adminData?.username,
          };
        });

        setChats(enriched);
      } catch {
        setChats(chatList);
      } finally {
        setIsLoading(false);
      }
    };

    const unsubscribers = queryDefs.map((queryDef) =>
      onSnapshot(queryDef, (snapshot) => {
        snapshot.forEach((docSnap) => {
          const chatData = docSnap.data();
          const chatId = docSnap.id;
          const lastMessageData = chatData.lastMessage || { text: 'Nova conversa' };

          mergedById.set(chatId, {
            id: chatId,
            adminUid: chatData.adminUid || '',
            adminUsername: chatData.adminUsername,
            userDisplayName: chatData.userDisplayName,
            userEmail: chatData.userEmail,
            userPhotoURL: chatData.userPhotoURL,
            adminPhotoURL: chatData.adminPhotoURL,
            lastMessage: lastMessageData,
            lastActivity: chatData.lastActivity,
            createdAt: chatData.createdAt,
          });
        });

        completedListeners += 1;
        if (completedListeners >= queryDefs.length) {
          void hydrateAndSetChats();
          completedListeners = 0;
        }
      })
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [userId, userEmail]);

  const handleChatClick = (chatId: string) => {
    router.push(`/subscriber/chat/${chatId}`);
  };

  const getLastMessageText = (chat: ChatConversation): string => {
    if (!chat.lastMessage) return 'Sem mensagens';

    if (chat.lastMessage.text) {
      return chat.lastMessage.text.length > 50
        ? chat.lastMessage.text.substring(0, 50) + '...'
        : chat.lastMessage.text;
    }
    if (chat.lastMessage.imageUrl) return '📷 Imagem';
    if (chat.lastMessage.videoUrl) return '🎥 Vídeo';

    return 'Nova mensagem';
  };

  const getLastActivityTime = (chat: ChatConversation): string => {
    const timestamp = chat.lastActivity || chat.createdAt;
    if (!timestamp) return '';

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
    } catch {
      return '';
    }
  };

  if (isLoading) {
    return (
      <Card style={{ backgroundColor: 'var(--app-container-color)', borderColor: 'var(--app-line-color)', color: 'var(--app-text-color)' }}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (chats.length === 0) {
    return (
      <Card style={{ backgroundColor: 'var(--app-container-color)', borderColor: 'var(--app-line-color)', color: 'var(--app-text-color)' }}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Mensagens</span>
          </CardTitle>
          <CardDescription>
            Suas conversas com criadores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Você ainda não tem conversas</p>
            <p className="text-sm mt-2">
              Inicie uma conversa visitando o perfil de um criador
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card style={{ backgroundColor: 'var(--app-container-color)', borderColor: 'var(--app-line-color)', color: 'var(--app-text-color)' }}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageSquare className="h-5 w-5" />
          <span>Mensagens</span>
        </CardTitle>
        <CardDescription>
          Suas conversas com criadores ({chats.length})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {chats.map((chat) => (
            <Button
              key={chat.id}
              variant="ghost"
              className="w-full justify-start p-4 h-auto hover:bg-muted"
              style={{ backgroundColor: 'var(--app-container-color)', color: 'var(--app-text-color)' }}
              onClick={() => handleChatClick(chat.id)}
            >
              <div className="flex items-start space-x-4 w-full">
                <Avatar className="h-12 w-12">
                  <AvatarImage
                    src={chat.adminPhotoURL || chat.userPhotoURL || '/placeholder-photo.svg'}
                    alt={chat.userDisplayName || chat.adminUsername}
                  />
                  <AvatarFallback>
                    {(chat.adminUsername || chat.userDisplayName || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold truncate">
                      {chat.adminUsername || chat.userDisplayName || 'Conversa'}
                    </p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                      {getLastActivityTime(chat)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {getLastMessageText(chat)}
                  </p>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

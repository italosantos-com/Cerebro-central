"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  getDocs,
  where,
  doc,
  getDoc,
  DocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import InboxItem from "./InboxItem";
import { useDebounce } from "./useDebounce";
import { Conversation } from "@/types/inbox";
import { Loader2 } from "lucide-react";

const PAGE_SIZE = 10;

export default function InboxLayout() {
  const [items, setItems] = useState<Conversation[]>([]);
  const [search, setSearch] = useState("");
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const debounced = useDebounce(search, 400);

  const pickAvatar = (...candidates: unknown[]): string => {
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate;
      }
    }
    return "";
  };

  useEffect(() => {
    // Use React state for both data sources to avoid race conditions
    let conversationsData: Conversation[] = [];
    let chatsData: Conversation[] = [];

    // Shared sorting function
    const sortConversations = (merged: Conversation[]) => {
      return merged.sort((a, b) => {
        // Sort by priority first (higher priority first)
        const priorityDiff = (b.priority || 0) - (a.priority || 0);
        if (priorityDiff !== 0) return priorityDiff;
        // Then by timestamp (newer first)
        return (b.timestamp || 0) - (a.timestamp || 0);
      });
    };

    // Update items whenever either data source changes
    const updateItems = () => {
      const merged = [...conversationsData, ...chatsData];
      const sorted = sortConversations(merged);
      setItems(sorted);
    };

    // Query conversations collection
    const conversationsQuery = query(
      collection(db, "conversations"),
      where("archived", "==", false),
      orderBy("priority", "desc"),
      orderBy("timestamp", "desc"),
      limit(PAGE_SIZE)
    );

    // Query chats collection (for secret chats and other site chats)
    const chatsQuery = query(
      collection(db, "chats"),
      orderBy("lastActivity", "desc"),
      limit(PAGE_SIZE)
    );

    const unsubConversations = onSnapshot(conversationsQuery, (snap) => {
      conversationsData = snap.docs.map((doc) => {
        const data = doc.data() as Record<string, any>;
        const displayName =
          data.name ||
          data.userDisplayName ||
          data.userName ||
          data.username ||
          data.userEmail ||
          'Conversa';

        const avatar =
          pickAvatar(
            data.avatar,
            data.userPhotoURL,
            data.userPhotoUrl,
            data.lastMessage?.senderPhotoURL,
            data.lastMessage?.senderPhotoUrl,
            data.lastMessage?.photoURL,
            data.lastMessage?.photoUrl,
            data.photoURL,
            data.photoUrl,
            data.profilePictureUrl,
            data.senderPhotoURL,
            data.senderPhotoUrl,
            data.adminPhotoURL,
            data.adminPhotoUrl,
            data.userAvatar,
            data.senderAvatar
          );

        return {
          id: doc.id,
          ...data,
          name: displayName,
          avatar,
          social: data.social || data.channel || 'site',
          lastMessage: data.lastMessage || data.lastMessageText || 'Sem mensagens',
          timestamp: data.timestamp || Date.now(),
          priority: Number(data.priority || 0),
          archived: Boolean(data.archived),
          online: Boolean(data.online),
        } as Conversation;
      });

      updateItems();
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
      setLoading(false);
    });

    const unsubChats = onSnapshot(chatsQuery, async (snap) => {
      const userPhotoCache = new Map<string, string>();

      // Transform chats data to match Conversation interface
      const chatsPromises = snap.docs.map(async (doc) => {
        const chatData = doc.data();
        const chatId = doc.id;

        // Get last message from chat document (denormalized) or subcollection
        let lastMessageText = '';
        if (chatData.lastMessage?.text) {
          lastMessageText = chatData.lastMessage.text;
        } else if (chatData.lastMessage?.imageUrl) {
          lastMessageText = '📷 Imagem';
        } else if (chatData.lastMessage?.videoUrl) {
          lastMessageText = '🎥 Vídeo';
        } else if (chatData.lastMessage?.isLocation) {
          lastMessageText = '📍 Localização';
        } else {
          // Fallback to subcollection query if no denormalized lastMessage
          try {
            const messagesRef = collection(db, `chats/${chatId}/messages`);
            const lastMessageQuery = query(messagesRef, orderBy("timestamp", "desc"), limit(1));
            const lastMessageSnap = await getDocs(lastMessageQuery);

            if (!lastMessageSnap.empty) {
              const msgData = lastMessageSnap.docs[0].data();
              if (msgData.text) {
                lastMessageText = msgData.text;
              } else if (msgData.imageUrl) {
                lastMessageText = '📷 Imagem';
              } else if (msgData.videoUrl) {
                lastMessageText = '🎥 Vídeo';
              } else if (msgData.isLocation) {
                lastMessageText = '📍 Localização';
              }
            }
          } catch (error) {
            console.error('Error fetching last message:', error);
          }
        }

        // Determine name and avatar
        const isSecretChat = chatId.startsWith('secret-chat-');
        const displayName =
          chatData.userDisplayName ||
          chatData.userName ||
          chatData.userEmail ||
          (isSecretChat ? '🔒 Chat Secreto' : 'Chat');

        let avatar = pickAvatar(
          chatData.userPhotoURL,
          chatData.userPhotoUrl,
          chatData.lastMessage?.senderPhotoURL,
          chatData.lastMessage?.senderPhotoUrl,
          chatData.lastMessage?.photoURL,
          chatData.lastMessage?.photoUrl,
          chatData.photoURL,
          chatData.photoUrl,
          chatData.profilePictureUrl,
          chatData.userAvatar,
          chatData.senderPhotoURL,
          chatData.senderPhotoUrl,
          chatData.senderAvatar
        );

        const userUid =
          typeof chatData.userUid === 'string'
            ? chatData.userUid
            : typeof chatData.userId === 'string'
              ? chatData.userId
              : '';

        const userEmail =
          typeof chatData.userEmail === 'string'
            ? chatData.userEmail
            : typeof chatData.email === 'string'
              ? chatData.email
              : '';

        if (!avatar && userUid) {
          const cached = userPhotoCache.get(userUid);
          if (cached) {
            avatar = cached;
          } else {
            try {
              const userSnap = await getDoc(doc(db, 'users', userUid));
              if (userSnap.exists()) {
                const userData = userSnap.data() as Record<string, unknown>;
                const resolvedPhoto = pickAvatar(
                  userData.photoURL,
                  userData.photoUrl,
                  userData.profilePictureUrl,
                  userData.avatar
                );
                if (resolvedPhoto) {
                  avatar = resolvedPhoto;
                  userPhotoCache.set(userUid, resolvedPhoto);
                }
              }
            } catch {
              // noop
            }
          }
        }

        if (!avatar && userEmail) {
          try {
            const usersByEmailQuery = query(
              collection(db, 'users'),
              where('email', '==', userEmail),
              limit(1)
            );
            const usersByEmailSnap = await getDocs(usersByEmailQuery);
            if (!usersByEmailSnap.empty) {
              const userData = usersByEmailSnap.docs[0].data() as Record<string, unknown>;
              const resolvedPhoto = pickAvatar(
                userData.photoURL,
                userData.photoUrl,
                userData.profilePictureUrl,
                userData.avatar,
                userData.picture
              );
              if (resolvedPhoto) {
                avatar = resolvedPhoto;
              }
            }
          } catch {
            // noop
          }
        }

        return {
          id: chatId,
          name: displayName,
          avatar,
          social: 'site', // Site chat channel
          lastMessage: lastMessageText,
          timestamp: chatData.lastActivity?.toMillis?.() || chatData.createdAt?.toMillis?.() || Date.now(),
          priority: 0,
          archived: false,
          online: false,
        } as Conversation;
      });

      chatsData = await Promise.all(chatsPromises);
      updateItems();
      setLoading(false);
    });

    return () => {
      unsubConversations();
      unsubChats();
    };
  }, []);

  const loadMore = async () => {
    if (!lastDoc || loadingMore || !hasMore) return;

    setLoadingMore(true);

    try {
      const q = query(
        collection(db, "conversations"),
        where("archived", "==", false),
        orderBy("priority", "desc"),
        orderBy("timestamp", "desc"),
        startAfter(lastDoc),
        limit(PAGE_SIZE)
      );

      const snap = await getDocs(q);

      const more = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Conversation));

      setItems((prev) => [...prev, ...more]);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error loading more conversations:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const filtered = items.filter((item) =>
    item.name.toLowerCase().includes(debounced.toLowerCase())
  );

  // When searching, we're filtering client-side, so we shouldn't show "load more"
  // since it would load items that might not match the search
  const showLoadMore = hasMore && !search;

  return (
    <div
      className="max-w-4xl mx-auto border shadow-lg rounded-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--app-container-color)',
        color: 'var(--app-text-color)',
        borderColor: 'var(--app-line-color)',
      }}
    >
      <div
        className="p-4 border-b"
        style={{
          borderColor: 'var(--app-line-color)',
          backgroundColor: 'var(--app-container-color)',
        }}
      >
        <h1 className="text-2xl font-bold text-foreground mb-4">Caixa de Entrada</h1>
        <input
          placeholder="Buscar conversas..."
          className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          style={{
            borderColor: 'var(--app-line-color)',
            backgroundColor: 'var(--app-background-color)',
            color: 'var(--app-text-color)',
          }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center p-12 text-muted-foreground">
          {search ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa disponível'}
        </div>
      ) : (
        <>
          {filtered.map((item) => (
            <InboxItem key={item.id} data={item} />
          ))}

          {showLoadMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full p-4 text-sm text-muted-foreground hover:bg-muted/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Carregando...
                </>
              ) : (
                'Carregar mais'
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}

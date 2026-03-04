"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Conversation } from "@/types/inbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Maximize2 } from "lucide-react";
import { useAdminConversation } from "@/contexts/admin-conversation-context";

interface InboxItemProps {
  data: Conversation;
}

export default function InboxItem({ data }: InboxItemProps) {
  const router = useRouter();
  const { openConversation } = useAdminConversation();
  const startX = useRef(0);
  const [translate, setTranslate] = useState(0);

  const removeConversation = async () => {
    const targetCollection = data.id.startsWith('secret-chat-') ? 'chats' : 'conversations';
    await deleteDoc(doc(db, targetCollection, data.id));
  };

  const handleStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };

  const handleMove = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientX - startX.current;
    if (delta < 0) setTranslate(delta);
  };

  const handleEnd = () => {
    if (translate < -120) removeConversation();
    setTranslate(0);
  };

  const handleClick = () => {
    router.push(`/admin/chat/${data.id}`);
  };

  const handleOpenFloating = (e: React.MouseEvent) => {
    e.stopPropagation();
    openConversation(data);
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <>
      <div className="relative overflow-hidden">
        <div className="absolute right-0 top-0 h-full w-24 bg-red-500 flex items-center justify-center text-white">
          Excluir
        </div>

        <div
          className="flex justify-between p-4 border-b cursor-pointer hover:bg-muted/30 transition-colors"
          style={{
            backgroundColor: 'var(--app-container-color)',
            color: 'var(--app-text-color)',
            borderColor: 'var(--app-line-color)',
            transform: `translateX(${translate}px)`,
          }}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
          onClick={handleClick}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative">
              <Avatar className="h-12 w-12">
                <AvatarImage src={data.avatar || '/placeholder-avatar.svg'} alt={data.name} />
                <AvatarFallback className="font-semibold">
                  {data.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {data.online && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-foreground truncate">{data.name}</h3>
                <span className="text-xs text-muted-foreground ml-2">{formatTimestamp(data.timestamp)}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">
                  {data.social}
                </span>
                <p className="text-sm text-muted-foreground truncate flex-1">{data.lastMessage}</p>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleOpenFloating}
            title="Abrir chat em janela"
            className="ml-2 flex-shrink-0"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

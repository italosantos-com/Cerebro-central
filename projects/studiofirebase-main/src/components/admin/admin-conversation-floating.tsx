"use client";

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Maximize2, Minus, Send, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAdminConversation } from '@/contexts/admin-conversation-context';

interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  timestamp: Timestamp | null;
  imageUrl?: string;
}

type Point = { x: number; y: number };

const MAX_MESSAGES = 50;

export default function AdminConversationFloating() {
  const { selectedConversation, closeConversation } = useAdminConversation();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [position, setPosition] = useState<Point | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const dragRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    offsetX: number;
    offsetY: number;
    moved: boolean;
    captureEl: HTMLElement | null;
  } | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingPosRef = useRef<Point | null>(null);

  const conversationId = selectedConversation?.id ?? null;

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const width = 380;
      const height = 520;
      const margin = 16;
      setPosition({
        x: window.innerWidth - width / 2 - margin,
        y: window.innerHeight - height / 2 - margin,
      });
    }
  }, []);

  // Reset position and state when a new conversation is opened
  useEffect(() => {
    if (conversationId) {
      setMinimized(false);
      setMessages([]);
      setNewMessage('');
      if (typeof window !== 'undefined') {
        const width = 380;
        const height = 520;
        const margin = 16;
        setPosition({
          x: window.innerWidth - width / 2 - margin,
          y: window.innerHeight - height / 2 - margin,
        });
      }
    }
  }, [conversationId]);

  // Listen for messages from the selected conversation
  useEffect(() => {
    if (!conversationId) return;
    const messagesRef = collection(db, 'chats', conversationId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(MAX_MESSAGES));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage));
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    });
    return () => unsubscribe();
  }, [conversationId]);

  // Drag support
  useEffect(() => {
    if (!mounted) return;

    const flushRaf = () => {
      rafRef.current = null;
      if (!pendingPosRef.current) return;
      setPosition(pendingPosRef.current);
    };

    const handleMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      if (event.pointerId !== drag.pointerId) return;

      const width = 380;
      const margin = 16;

      const dx = event.clientX - drag.startClientX;
      const dy = event.clientY - drag.startClientY;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 6) {
        drag.moved = true;
      }

      const x = event.clientX - drag.offsetX;
      const y = event.clientY - drag.offsetY;

      const maxX = window.innerWidth - margin - width / 2;
      const minX = margin + width / 2;
      const maxY = window.innerHeight - margin - 20;
      const minY = margin + 20;

      pendingPosRef.current = {
        x: Math.min(Math.max(x, minX), maxX),
        y: Math.min(Math.max(y, minY), maxY),
      };

      if (rafRef.current == null) {
        rafRef.current = window.requestAnimationFrame(flushRaf);
      }
    };

    const endDrag = () => {
      const drag = dragRef.current;
      if (!drag) return;
      try {
        if (drag.captureEl && drag.captureEl.hasPointerCapture(drag.pointerId)) {
          drag.captureEl.releasePointerCapture(drag.pointerId);
        }
      } catch {
        // ignore
      }
      dragRef.current = null;
    };

    const handleUp = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;
      endDrag();
    };

    const handleCancel = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;
      endDrag();
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleCancel);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleCancel);
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [mounted]);

  const handleDragStart = (event: React.PointerEvent<HTMLElement>) => {
    if (!position) return;
    event.preventDefault();
    const pointerId = event.pointerId;
    try {
      event.currentTarget.setPointerCapture(pointerId);
    } catch {
      // ignore
    }
    dragRef.current = {
      pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      offsetX: event.clientX - position.x,
      offsetY: event.clientY - position.y,
      moved: false,
      captureEl: event.currentTarget,
    };
  };

  const handleSendMessage = async () => {
    if (!conversationId) return;
    const trimmed = newMessage.trim();
    if (!trimmed || isSending) return;
    setIsSending(true);
    try {
      const messagesRef = collection(db, 'chats', conversationId, 'messages');
      await addDoc(messagesRef, {
        text: trimmed,
        senderId: 'admin',
        timestamp: serverTimestamp(),
      });
      setNewMessage('');
    } catch (err) {
      console.error('[AdminConversationFloating] Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenFullChat = () => {
    if (!conversationId) return;
    router.push(`/admin/chat/${conversationId}`);
    closeConversation();
  };

  if (!mounted || !selectedConversation || !position || typeof document === 'undefined') return null;

  const windowWidth = 380;
  const headerHeight = 52;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        left: position.x - windowWidth / 2,
        top: position.y - (minimized ? headerHeight / 2 : 260),
        width: windowWidth,
        zIndex: 9999,
      }}
      className="flex flex-col rounded-2xl overflow-hidden border border-white/20 bg-white/10 backdrop-blur-[24px] shadow-[0_25px_60px_rgba(0,0,0,0.45)]"
    >
      {/* Header – drag handle */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-white/20 bg-white/10 cursor-grab active:cursor-grabbing select-none"
        onPointerDown={handleDragStart}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="h-7 w-7 flex-shrink-0">
            <AvatarImage src={selectedConversation.avatar || '/placeholder-avatar.svg'} alt={selectedConversation.name} />
            <AvatarFallback className="text-xs">{selectedConversation.name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="truncate text-sm font-semibold text-white/95">{selectedConversation.name}</span>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleOpenFullChat}
            className="h-7 w-7 text-white/70 hover:bg-white/15 hover:text-white"
            title="Abrir página completa"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMinimized((v) => !v)}
            className="h-7 w-7 text-white/70 hover:bg-white/15 hover:text-white"
            title={minimized ? 'Expandir' : 'Minimizar'}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={closeConversation}
            className="h-7 w-7 text-white/70 hover:bg-white/15 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ height: 400 }}>
            {messages.length === 0 && (
              <p className="text-center text-white/40 text-sm mt-8">Nenhuma mensagem ainda.</p>
            )}
            {messages.map((msg) => {
              const isAdmin = msg.senderId === 'admin';
              return (
                <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                      isAdmin
                        ? 'bg-white/30 text-white rounded-br-sm border border-white/20'
                        : 'bg-white/20 text-white rounded-bl-sm border border-white/15'
                    }`}
                    style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                  >
                    {msg.text}
                    {msg.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={msg.imageUrl} alt="imagem" className="mt-2 rounded max-h-40 w-full object-cover" />
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-white/20 bg-white/5 px-3 py-2 flex items-end gap-2">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Digite uma mensagem..."
              className="flex-1 bg-white/10 border-white/20 text-white placeholder-white/50 min-h-[40px] h-10 max-h-20 resize-none focus-visible:ring-white/30"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSendMessage();
                }
              }}
            />
            <Button
              size="icon"
              onClick={() => void handleSendMessage()}
              disabled={isSending || !newMessage.trim()}
              className="h-10 w-10 bg-white/20 text-white hover:bg-white/30"
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </>
      )}
    </div>,
    document.body
  );
}

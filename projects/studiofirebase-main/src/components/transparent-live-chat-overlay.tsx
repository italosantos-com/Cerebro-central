"use client";

import { useState, useEffect, useRef } from 'react';
import { X, Send } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, Timestamp, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUserAuth } from '@/hooks/use-user-auth';
import { useProfileConfig } from '@/hooks/use-profile-config';
import { getPublicUsernameFromPathname } from '@/utils/public-admin-scope';
import { resolveAdminUidByUsername } from '@/utils/admin-lookup-client';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface Message {
    id: string;
    senderId: string;
    text: string;
    timestamp: Timestamp;
}

// Get or create chatId from localStorage (similar to secret chat)
function getOrCreateChatId(scope?: string): string {
    if (globalThis.window === undefined) {
        return '';
    }

    const normalizedScope = (scope ?? '').trim().toLowerCase();
    const safeScope = normalizedScope
        ? normalizedScope.replaceAll(/[^a-z0-9_-]/g, '').slice(0, 40)
        : '';
    const storageKey = safeScope ? `secretChatId:${safeScope}` : 'secretChatId';

    let chatId = localStorage.getItem(storageKey);
    if (!chatId) {
        const randomId = Math.random().toString(36).substring(2, 8);
        chatId = safeScope ? `secret-chat-${safeScope}-${randomId}` : `secret-chat-${randomId}`;
        localStorage.setItem(storageKey, chatId);
    }
    return chatId;
}

interface TransparentLiveChatOverlayProps {
    isOpen: boolean;
    onClose?: () => void;
}

export default function TransparentLiveChatOverlay({ isOpen, onClose }: TransparentLiveChatOverlayProps) {
    const { user, userProfile } = useUserAuth();
    const { settings: profileSettings } = useProfileConfig();
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatId = useRef<string>('');
    const publicUsernameRef = useRef<string | null>(null);
    const adminUidRef = useRef<string | null>(null);
    const sessionId = useRef<string>('');

    // Initialize chat and resolve admin scope
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const initChat = async () => {
            try {
                const publicUsername = getPublicUsernameFromPathname();
                publicUsernameRef.current = publicUsername;

                if (publicUsername) {
                    const adminUid = await resolveAdminUidByUsername(publicUsername);
                    adminUidRef.current = adminUid;
                }

                chatId.current = getOrCreateChatId(publicUsername || undefined);
                // Create a session ID for this user
                sessionId.current = `user-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
                setIsLoading(false);
            } catch (error) {
                console.error('[TransparentChat] Error initializing:', error);
                setIsLoading(false);
            }
        };

        initChat();
    }, []);

    // Listen to messages
    useEffect(() => {
        if (!chatId.current || isLoading) return;

        const scope = publicUsernameRef.current;
        const messagesPath = scope
            ? `chat-sessions-${scope}/${chatId.current}/messages`
            : `chat-sessions/${chatId.current}/messages`;

        const messagesRef = collection(db, messagesPath);
        const q = query(messagesRef, orderBy('timestamp', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Message));
            setMessages(msgs);
        });

        return () => unsubscribe();
    }, [isLoading]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Handle sending messages
    const handleSendMessage = async (text: string) => {
        const trimmedMessage = text.trim();
        if (trimmedMessage === '' || isSending || !sessionId.current || !chatId.current) {
            return;
        }

        setIsSending(true);
        try {
            if (!db) throw new Error('Firestore não está inicializado');
            const chatDocRef = doc(db, 'chats', chatId.current);
            const messagesCollection = collection(chatDocRef, 'messages');

            let adminUid = adminUidRef.current;
            if (!adminUid && globalThis.window) {
                const username = getPublicUsernameFromPathname(globalThis.window.location.pathname);
                if (username) {
                    adminUid = await resolveAdminUidByUsername(username);
                    adminUidRef.current = adminUid;
                }
            }

            // Create chat document if it doesn't exist
            const chatDocData: Record<string, any> = {
                createdAt: serverTimestamp(),
                lastActivity: serverTimestamp(),
            };
            if (adminUid) {
                chatDocData.adminUid = adminUid;
            }
            if (user?.uid) {
                chatDocData.userUid = user.uid;
            }
            if (user?.email) {
                chatDocData.userEmail = user.email;
            }
            if (user?.displayName || userProfile?.displayName) {
                chatDocData.userDisplayName = user?.displayName || userProfile?.displayName;
            }
            await setDoc(chatDocRef, chatDocData, { merge: true });

            // Send message
            const messageData: any = {
                senderId: sessionId.current,
                text: trimmedMessage,
                timestamp: serverTimestamp(),
            };

            // If user is logged in, add real UID for avatar lookup
            if (user?.uid) {
                messageData.realUserId = user.uid;
            }
            if (user?.email) {
                messageData.userEmail = user.email;
            }
            if (user?.displayName || userProfile?.displayName) {
                messageData.userDisplayName = user?.displayName || userProfile?.displayName;
            }

            await addDoc(messagesCollection, messageData);
            setNewMessage('');

            // Trigger auto-reply (fire-and-forget)
            if (trimmedMessage) {
                void fetch('/api/secret-chat/auto-reply', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({
                        chatId: chatId.current,
                        text: trimmedMessage,
                    }),
                }).catch(() => {
                    // Ignore errors silently
                });
            }
        } catch (error) {
            console.error('[TransparentChat] Error sending message:', error);
        } finally {
            setIsSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Transparent backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Transparent chat overlay */}
            <div className="relative w-full max-w-2xl h-[80vh] bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                {/* Close button */}
                {onClose && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                    >
                        <X className="h-5 w-5 text-white" />
                    </button>
                )}

                {/* Messages container */}
                <div className="flex-1 p-6 overflow-y-auto space-y-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-40">
                            <div className="text-white/70">Carregando...</div>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex items-center justify-center h-40">
                            <div className="text-white/70 text-center">
                                <p className="text-lg">Sem mensagens ainda</p>
                                <p className="text-sm mt-2">As mensagens aparecerão aqui</p>
                            </div>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div 
                                key={msg.id} 
                                className={`flex items-start gap-4 ${msg.senderId === 'admin' ? 'flex-row' : 'flex-row-reverse'}`}
                            >
                                {/* Avatar */}
                                <div className="flex-shrink-0">
                                    {msg.senderId === 'admin' ? (
                                        <Avatar className="h-12 w-12 border-2 border-white/30">
                                            <AvatarImage src={profileSettings?.profilePictureUrl} alt="Admin" />
                                            <AvatarFallback className="bg-blue-500 text-white">A</AvatarFallback>
                                        </Avatar>
                                    ) : (
                                        <Avatar className="h-12 w-12 border-2 border-white/30">
                                            <AvatarImage 
                                                src={userProfile?.photoURL || user?.photoURL || undefined} 
                                                alt="Usuário" 
                                            />
                                            <AvatarFallback className="bg-green-500 text-white">
                                                {userProfile?.displayName?.charAt(0) || 
                                                 user?.displayName?.charAt(0) || 
                                                 user?.email?.charAt(0) || 'U'}
                                            </AvatarFallback>
                                        </Avatar>
                                    )}
                                </div>

                                {/* Message bubble */}
                                <div className="flex-1 min-w-0">
                                    <div 
                                        className={`
                                            inline-block px-4 py-3 rounded-2xl max-w-[80%]
                                            ${msg.senderId === 'admin' 
                                                ? 'bg-white/20 text-white rounded-tl-none' 
                                                : 'bg-white/30 text-white rounded-tr-none'
                                            }
                                        `}
                                    >
                                        <p className="text-sm md:text-base leading-relaxed" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                            {msg.text}
                                        </p>
                                        <p className="text-xs text-white/60 mt-1">
                                            {msg.timestamp?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Enviando...'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Message input section */}
                <div className="p-4 border-t border-white/20">
                    <div className="flex items-center space-x-2">
                        <Textarea
                            placeholder="Escreva sua mensagem..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage(newMessage);
                                }
                            }}
                            className="flex-1 bg-white/10 border-white/20 text-white placeholder-white/50 min-h-[40px] h-10 max-h-20 resize-none focus:bg-white/15"
                            disabled={isSending || isLoading}
                            rows={1}
                        />
                        <Button
                            type="submit"
                            size="icon"
                            onClick={() => handleSendMessage(newMessage)}
                            disabled={isSending || isLoading || newMessage.trim() === ''}
                            className="bg-white/20 hover:bg-white/30 text-white transition-colors h-10 w-10"
                        >
                            <Send className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, orderBy, onSnapshot, addDoc, Timestamp, doc, getDoc, updateDoc, serverTimestamp, getDocs, limit, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Send, Paperclip, MapPin, Video, Image as ImageIcon, FileText, Loader2, MessageSquare, Globe, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useChatTranslation } from '@/hooks/use-chat-translation';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { onAuthStateChanged } from 'firebase/auth';
import VideoRoom from '@/components/video-room';

type ConversationSettings = {
    autoReplyEnabled: boolean;
    replyTone: 'humanized' | 'robotic';
};

interface Message {
    id: string;
    text: string;
    senderId: string;
    timestamp: Timestamp;
    imageUrl?: string;
    videoUrl?: string;
    fileUrl?: string;
    fileName?: string;
    isLocation?: boolean;
    latitude?: number;
    longitude?: number;
    realUserId?: string;
    userEmail?: string;
    userDisplayName?: string;
    isCharge?: boolean;
    chargeAmount?: number;
    hasLockedMedia?: boolean;
    lockedMediaUrl?: string;
    lockedMediaType?: 'image' | 'video' | 'file';
    lockedMediaName?: string;
}

interface UserInfo {
    uid: string;
    displayName?: string;
    photoURL?: string;
    email?: string;
}

export default function AdminChatPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const chatId = Array.isArray(params?.chatId) ? params.chatId[0] : (params?.chatId ?? '');

    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [authResolved, setAuthResolved] = useState(false);
    const [currentAdminUid, setCurrentAdminUid] = useState<string | null>(null);
    const [currentAdminUsername, setCurrentAdminUsername] = useState<string | null>(null);
    const [isMainAdmin, setIsMainAdmin] = useState(false);
    const [isChatAuthorized, setIsChatAuthorized] = useState<boolean | null>(null);

    const [settingsLoading, setSettingsLoading] = useState(true);
    const [settingsSaving, setSettingsSaving] = useState(false);
    const [conversationSettings, setConversationSettings] = useState<ConversationSettings>({
        autoReplyEnabled: false,
        replyTone: 'humanized',
    });
    const [translatedMessages, setTranslatedMessages] = useState<Record<string, string>>({});
    const [translateLoading, setTranslateLoading] = useState<Record<string, boolean>>({});
    const [isChargeDialogOpen, setIsChargeDialogOpen] = useState(false);
    const [isVideoRoomOpen, setIsVideoRoomOpen] = useState(false);
    const [chargeAmount, setChargeAmount] = useState('');
    const [chargeMedia, setChargeMedia] = useState<File | null>(null);
    const [chargeMediaName, setChargeMediaName] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const chargeMediaInputRef = useRef<HTMLInputElement>(null);

    const getAuthHeaders = async () => {
        const user = auth.currentUser;
        if (!user) return {} as Record<string, string>;
        const token = await user.getIdToken();
        return { Authorization: `Bearer ${token}` };
    };

    const fetchConversationSettings = async () => {
        try {
            const headers = await getAuthHeaders();
            if (!headers.Authorization) {
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

            const s = data.settings || {};
            setConversationSettings({
                autoReplyEnabled: Boolean(s.autoReplyEnabled),
                replyTone: s.replyTone === 'robotic' ? 'robotic' : 'humanized',
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
    };

    const saveConversationSettings = async (next: ConversationSettings) => {
        setSettingsSaving(true);
        try {
            const headers = await getAuthHeaders();
            if (!headers.Authorization) {
                throw new Error('Faça login novamente para alterar a automação');
            }

            const response = await fetch('/api/admin/conversation-settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...headers,
                },
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
    };

    // Resolver admin atual (uid + isMainAdmin + username)
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                setCurrentAdminUid(null);
                setCurrentAdminUsername(null);
                setIsMainAdmin(false);
                setAuthResolved(true);
                return;
            }

            setCurrentAdminUid(user.uid);
            try {
                const adminDoc = await getDoc(doc(db, 'admins', user.uid));
                const adminData = adminDoc.exists() ? adminDoc.data() : null;
                const username = typeof adminData?.username === 'string' ? adminData.username : null;
                setCurrentAdminUsername(username);
                setIsMainAdmin(!!adminData?.isMainAdmin);
            } catch (err) {
                console.error('[AdminChatPage] Falha ao carregar admin doc:', err);
                setCurrentAdminUsername(null);
                setIsMainAdmin(false);
            } finally {
                setAuthResolved(true);
            }
        });

        return () => unsubscribe();
    }, []);

    // Verificar se o admin atual pode acessar este chat
    useEffect(() => {
        const checkOwnership = async () => {
            if (!chatId) {
                setIsChatAuthorized(false);
                return;
            }

            // Ainda aguardando o resultado do auth
            if (!authResolved) {
                setIsChatAuthorized(null);
                return;
            }

            // Ainda não sabemos quem é o admin logado
            if (!currentAdminUid) {
                setIsChatAuthorized(false);
                return;
            }

            // Main admin sempre pode acessar
            if (isMainAdmin) {
                setIsChatAuthorized(true);
                return;
            }

            try {
                const chatSnap = await getDoc(doc(db, 'chats', chatId));
                const chatData = chatSnap.exists() ? chatSnap.data() : null;
                const chatAdminUid = typeof chatData?.adminUid === 'string' ? chatData.adminUid : null;

                // Preferência: validação pelo adminUid carimbado no documento
                if (chatAdminUid) {
                    const allowed = chatAdminUid === currentAdminUid;
                    setIsChatAuthorized(allowed);
                    return;
                }

                // Fallback seguro (dados antigos): chatId escopado por username do admin
                const normalizedUsername = (currentAdminUsername || '').trim().toLowerCase();
                if (normalizedUsername && chatId.startsWith(`secret-chat-${normalizedUsername}-`)) {
                    setIsChatAuthorized(true);
                    return;
                }

                setIsChatAuthorized(false);
            } catch (error) {
                console.error('[AdminChatPage] Erro ao validar owner do chat:', error);
                setIsChatAuthorized(false);
            }
        };

        setIsChatAuthorized(null);
        checkOwnership();
    }, [authResolved, chatId, currentAdminUid, currentAdminUsername, isMainAdmin]);

    // Carregar configurações de automação (por admin)
    useEffect(() => {
        if (!authResolved) return;
        void fetchConversationSettings();
         
    }, [authResolved]);

    // Se não autorizado, bloquear acesso (evita que outro admin abra chatId de terceiros)
    useEffect(() => {
        if (authResolved && isChatAuthorized === false) {
            toast({
                title: 'Acesso negado',
                description: 'Você não tem permissão para acessar este chat.',
                variant: 'destructive',
            });
            router.replace('/admin/conversations');
        }
    }, [authResolved, isChatAuthorized, router, toast]);

    // Buscar informações do usuário
    useEffect(() => {
        const fetchUserInfo = async () => {
            try {
                if (!chatId) return;

                const resolveUserByUid = async (userId: string) => {
                    const userDoc = await getDoc(doc(db, 'users', userId));
                    if (!userDoc.exists()) return false;
                    const data = userDoc.data();
                    setUserInfo({
                        uid: userId,
                        displayName: data.displayName || data.name || 'Usuário',
                        photoURL: data.photoURL || data.profilePictureUrl,
                        email: data.email
                    });
                    return true;
                };

                const resolveUserByEmail = async (email: string) => {
                    const usersRef = collection(db, 'users');
                    const q = query(usersRef, where('email', '==', email), limit(1));
                    const snap = await getDocs(q);
                    if (snap.empty) {
                        setUserInfo({
                            uid: 'visitante',
                            displayName: 'Visitante',
                            photoURL: undefined,
                            email
                        });
                        return true;
                    }

                    const docSnap = snap.docs[0];
                    const data = docSnap.data();
                    setUserInfo({
                        uid: docSnap.id,
                        displayName: data.displayName || data.name || 'Usuário',
                        photoURL: data.photoURL || data.profilePictureUrl,
                        email: data.email
                    });
                    return true;
                };

                let resolved = false;

                // 1) Tentar usar dados diretos do documento do chat
                const chatSnap = await getDoc(doc(db, 'chats', chatId));
                if (chatSnap.exists()) {
                    const chatData = chatSnap.data();
                    const userUid = typeof chatData?.userUid === 'string' ? chatData.userUid : null;
                    const userEmail = typeof chatData?.userEmail === 'string' ? chatData.userEmail : null;
                    const userDisplayName = typeof chatData?.userDisplayName === 'string' ? chatData.userDisplayName : null;

                    if (userUid) {
                        resolved = await resolveUserByUid(userUid);
                    } else if (userEmail) {
                        resolved = await resolveUserByEmail(userEmail);
                    } else if (userDisplayName) {
                        setUserInfo({
                            uid: 'visitante',
                            displayName: userDisplayName,
                            photoURL: undefined,
                            email: userEmail || undefined
                        });
                        resolved = true;
                    }
                }

                // 2) Fallback legado: chatId com UID embutido
                if (!resolved && chatId.startsWith('secret-chat-')) {
                    const userId = chatId.replace('secret-chat-', '');
                    if (userId.length >= 20) {
                        resolved = await resolveUserByUid(userId);
                    }
                }

                // 3) Fallback: buscar última mensagem e extrair UID/email
                if (!resolved) {
                    const messagesRef = collection(db, 'chats', chatId, 'messages');
                    const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(1));
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                        const msg = snap.docs[0].data() as Message;
                        if (msg.realUserId) {
                            resolved = await resolveUserByUid(msg.realUserId);
                        } else if (msg.userEmail) {
                            resolved = await resolveUserByEmail(msg.userEmail);
                        } else if (msg.userDisplayName) {
                            setUserInfo({
                                uid: 'visitante',
                                displayName: msg.userDisplayName,
                                photoURL: undefined,
                                email: msg.userEmail || undefined
                            });
                            resolved = true;
                        }
                    }
                }

                if (!resolved) {
                    setUserInfo({
                        uid: 'visitante',
                        displayName: 'Visitante',
                        photoURL: undefined,
                        email: undefined
                    });
                }
            } catch (error) {
                console.error('Erro ao buscar informações do usuário:', error);
            }
        };

        fetchUserInfo();
    }, [chatId]);

    // Carregar mensagens em tempo real
    useEffect(() => {
        // Só conectar no listener quando houver autorização explícita
        if (isChatAuthorized !== true) {
            setIsLoading(true);
            return;
        }

        setIsLoading(true);

        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedMessages: Message[] = [];
            snapshot.forEach((doc) => {
                loadedMessages.push({ id: doc.id, ...doc.data() } as Message);
            });
            setMessages(loadedMessages);
            setIsLoading(false);

            // Scroll para o final
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        });

        return () => unsubscribe();
    }, [chatId, isChatAuthorized]);

    // Auto-scroll quando novas mensagens chegam
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Enviar mensagem de texto
    const handleSendMessage = async () => {
        if (isChatAuthorized !== true) return;
        if (!newMessage.trim() || isSending) return;

        setIsSending(true);
        try {
            const messagesRef = collection(db, 'chats', chatId, 'messages');
            await addDoc(messagesRef, {
                text: newMessage,
                senderId: 'admin',
                timestamp: serverTimestamp(),
            });

            // Atualizar lastMessage do chat
            const chatRef = doc(db, 'chats', chatId);
            await updateDoc(chatRef, {
                lastMessage: {
                    text: newMessage,
                    senderId: 'admin',
                    timestamp: serverTimestamp(),
                }
            });

            setNewMessage('');
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            toast({
                title: 'Erro',
                description: 'Não foi possível enviar a mensagem.',
                variant: 'destructive'
            });
        } finally {
            setIsSending(false);
        }
    };

    // Abrir diálogo de cobrança
    const handleSendCharge = () => {
        if (isChatAuthorized !== true) return;
        setIsChargeDialogOpen(true);
        setChargeAmount('');
        setChargeMedia(null);
        setChargeMediaName('');
    };

    // Enviar cobrança com mídia protegida
    const handleSendChargeWithMedia = async () => {
        if (!chargeAmount || isNaN(parseFloat(chargeAmount))) {
            toast({
                title: 'Valor inválido',
                description: 'Por favor, informe um valor válido.',
                variant: 'destructive'
            });
            return;
        }

        const chargeAmountNum = parseFloat(chargeAmount);
        setIsUploading(true);

        try {
            let mediaUrl = '';
            let mediaType = '';

            // Se houver mídia, fazer upload
            if (chargeMedia) {
                const storageRef = ref(storage, `charge-media/${chatId}/${Date.now()}_${chargeMedia.name}`);
                await uploadBytes(storageRef, chargeMedia);
                mediaUrl = await getDownloadURL(storageRef);

                // Determinar tipo de mídia
                if (chargeMedia.type.startsWith('image/')) {
                    mediaType = 'image';
                } else if (chargeMedia.type.startsWith('video/')) {
                    mediaType = 'video';
                } else {
                    mediaType = 'file';
                }
            }

            const messagesRef = collection(db, 'chats', chatId, 'messages');
            
            // Preparar dados da mensagem
            const messageData: any = {
                text: `💰 Cobrança de R$ ${chargeAmountNum.toFixed(2)}${chargeMedia ? ' com mídia bloqueada' : ''}`,
                senderId: 'admin',
                timestamp: serverTimestamp(),
                isCharge: true,
                chargeAmount: chargeAmountNum
            };

            // Se houver mídia, adicionar dados dela
            if (mediaUrl) {
                messageData.hasLockedMedia = true;
                messageData.lockedMediaUrl = mediaUrl;
                messageData.lockedMediaType = mediaType;
                messageData.lockedMediaName = chargeMedia?.name || 'Mídia bloqueada';
            }

            await addDoc(messagesRef, messageData);

            // Atualizar lastMessage
            const chatRef = doc(db, 'chats', chatId);
            await updateDoc(chatRef, {
                lastMessage: {
                    text: `💰 Cobrança de R$ ${chargeAmountNum.toFixed(2)}${chargeMedia ? ' com mídia' : ''}`,
                    senderId: 'admin',
                    timestamp: serverTimestamp(),
                    isCharge: true
                }
            });

            toast({
                title: 'Cobrança enviada',
                description: `Cobrança de R$ ${chargeAmountNum.toFixed(2)} foi solicitada${chargeMedia ? ' com mídia bloqueada' : ''}.`
            });

            // Fechar diálogo e limpar
            setIsChargeDialogOpen(false);
            setChargeAmount('');
            setChargeMedia(null);
            setChargeMediaName('');
            if (chargeMediaInputRef.current) {
                chargeMediaInputRef.current.value = '';
            }
        } catch (error) {
            console.error('Erro ao enviar cobrança:', error);
            toast({
                title: 'Erro',
                description: 'Não foi possível enviar a cobrança.',
                variant: 'destructive'
            });
        } finally {
            setIsUploading(false);
        }
    };

    // Tratador de seleção de mídia para cobrança
    const handleChargeMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validar tamanho (máximo 50MB para vídeo, 10MB para outros)
        const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
        if (file.size > maxSize) {
            toast({
                title: 'Arquivo Muito Grande',
                description: `O arquivo deve ter no máximo ${file.type.startsWith('video/') ? '50' : '10'}MB.`,
                variant: 'destructive'
            });
            if (chargeMediaInputRef.current) {
                chargeMediaInputRef.current.value = '';
            }
            return;
        }

        setChargeMedia(file);
        setChargeMediaName(file.name);
    };

    // Enviar localização
    const handleSendLocation = () => {
        if (isChatAuthorized !== true) return;
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const { latitude, longitude } = position.coords;
                        const messagesRef = collection(db, 'chats', chatId, 'messages');

                        await addDoc(messagesRef, {
                            text: `📍 Localização: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                            senderId: 'admin',
                            timestamp: serverTimestamp(),
                            isLocation: true,
                            latitude,
                            longitude
                        });

                        // Atualizar lastMessage
                        const chatRef = doc(db, 'chats', chatId);
                        await updateDoc(chatRef, {
                            lastMessage: {
                                text: '📍 Localização',
                                senderId: 'admin',
                                timestamp: serverTimestamp(),
                                isLocation: true
                            }
                        });

                        toast({
                            title: 'Localização enviada',
                            description: 'Sua localização foi compartilhada com sucesso.'
                        });
                    } catch (error) {
                        console.error('Erro ao enviar localização:', error);
                        toast({
                            title: 'Erro',
                            description: 'Não foi possível enviar a localização.',
                            variant: 'destructive'
                        });
                    }
                },
                (error) => {
                    toast({
                        title: 'Erro de Localização',
                        description: 'Não foi possível obter sua localização. Verifique as permissões.',
                        variant: 'destructive'
                    });
                }
            );
        } else {
            toast({
                title: 'Não Suportado',
                description: 'Seu navegador não suporta geolocalização.',
                variant: 'destructive'
            });
        }
    };

    // Upload de imagem
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isChatAuthorized !== true) return;
        const file = e.target.files?.[0];
        if (!file) return;

        // Validar tipo de arquivo
        if (!file.type.startsWith('image/')) {
            toast({
                title: 'Arquivo Inválido',
                description: 'Por favor, selecione uma imagem válida.',
                variant: 'destructive'
            });
            return;
        }

        // Validar tamanho (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast({
                title: 'Arquivo Muito Grande',
                description: 'A imagem deve ter no máximo 5MB.',
                variant: 'destructive'
            });
            return;
        }

        setIsUploading(true);
        try {
            // Upload para Firebase Storage
            const storageRef = ref(storage, `chat-images/${chatId}/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const imageUrl = await getDownloadURL(storageRef);

            // Enviar mensagem com imagem
            const messagesRef = collection(db, 'chats', chatId, 'messages');
            await addDoc(messagesRef, {
                text: '📷 Imagem',
                senderId: 'admin',
                timestamp: serverTimestamp(),
                imageUrl
            });

            // Atualizar lastMessage
            const chatRef = doc(db, 'chats', chatId);
            await updateDoc(chatRef, {
                lastMessage: {
                    text: '📷 Imagem',
                    senderId: 'admin',
                    timestamp: serverTimestamp(),
                    imageUrl
                }
            });

            toast({
                title: 'Imagem Enviada',
                description: 'Sua imagem foi enviada com sucesso.'
            });
        } catch (error) {
            console.error('Erro ao enviar imagem:', error);
            toast({
                title: 'Erro',
                description: 'Não foi possível enviar a imagem.',
                variant: 'destructive'
            });
        } finally {
            setIsUploading(false);
            if (imageInputRef.current) {
                imageInputRef.current.value = '';
            }
        }
    };

    // Upload de vídeo
    const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validar tipo de arquivo
        if (!file.type.startsWith('video/')) {
            toast({
                title: 'Arquivo Inválido',
                description: 'Por favor, selecione um vídeo válido.',
                variant: 'destructive'
            });
            return;
        }

        // Validar tamanho (máximo 50MB)
        if (file.size > 50 * 1024 * 1024) {
            toast({
                title: 'Arquivo Muito Grande',
                description: 'O vídeo deve ter no máximo 50MB.',
                variant: 'destructive'
            });
            return;
        }

        setIsUploading(true);
        try {
            const storageRef = ref(storage, `chat-videos/${chatId}/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const videoUrl = await getDownloadURL(storageRef);

            const messagesRef = collection(db, 'chats', chatId, 'messages');
            await addDoc(messagesRef, {
                text: '🎥 Vídeo',
                senderId: 'admin',
                timestamp: serverTimestamp(),
                videoUrl
            });

            const chatRef = doc(db, 'chats', chatId);
            await updateDoc(chatRef, {
                lastMessage: {
                    text: '🎥 Vídeo',
                    senderId: 'admin',
                    timestamp: serverTimestamp(),
                    videoUrl
                }
            });

            toast({
                title: 'Vídeo Enviado',
                description: 'Seu vídeo foi enviado com sucesso.'
            });
        } catch (error) {
            console.error('Erro ao enviar vídeo:', error);
            toast({
                title: 'Erro',
                description: 'Não foi possível enviar o vídeo.',
                variant: 'destructive'
            });
        } finally {
            setIsUploading(false);
            if (videoInputRef.current) {
                videoInputRef.current.value = '';
            }
        }
    };

    // Upload de arquivo
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validar tamanho (máximo 10MB)
        if (file.size > 10 * 1024 * 1024) {
            toast({
                title: 'Arquivo Muito Grande',
                description: 'O arquivo deve ter no máximo 10MB.',
                variant: 'destructive'
            });
            return;
        }

        setIsUploading(true);
        try {
            const storageRef = ref(storage, `chat-files/${chatId}/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const fileUrl = await getDownloadURL(storageRef);

            const messagesRef = collection(db, 'chats', chatId, 'messages');
            await addDoc(messagesRef, {
                text: `📎 ${file.name}`,
                senderId: 'admin',
                timestamp: serverTimestamp(),
                fileUrl,
                fileName: file.name
            });

            const chatRef = doc(db, 'chats', chatId);
            await updateDoc(chatRef, {
                lastMessage: {
                    text: `📎 ${file.name}`,
                    senderId: 'admin',
                    timestamp: serverTimestamp(),
                    fileUrl
                }
            });

            toast({
                title: 'Arquivo Enviado',
                description: 'Seu arquivo foi enviado com sucesso.'
            });
        } catch (error) {
            console.error('Erro ao enviar arquivo:', error);
            toast({
                title: 'Erro',
                description: 'Não foi possível enviar o arquivo.',
                variant: 'destructive'
            });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    // Iniciar videochamada
    const handleVideoCall = () => {
        if (!userInfo?.uid || userInfo.uid === 'visitante') {
            toast({
                title: 'Videochamada indisponível',
                description: 'Não foi possível identificar o UID do participante.',
                variant: 'destructive',
            });
            return;
        }
        setIsVideoRoomOpen(true);
    };

    // Traduzir mensagem
    const handleTranslateMessage = async (messageId: string, text: string) => {
        if (translatedMessages[messageId]) {
            // Se já tem tradução, remove (toggle)
            setTranslatedMessages(prev => {
                const newTranslations = { ...prev };
                delete newTranslations[messageId];
                return newTranslations;
            });
            return;
        }

        setTranslateLoading(prev => ({ ...prev, [messageId]: true }));
        try {
            const response = await fetch('/api/chat/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text,
                    targetLanguage: 'pt-BR'
                })
            });

            const data = await response.json();
            if (data.translatedText) {
                setTranslatedMessages(prev => ({
                    ...prev,
                    [messageId]: data.translatedText
                }));
            } else {
                toast({
                    title: 'Erro na Tradução',
                    description: 'Não foi possível traduzir a mensagem.',
                    variant: 'destructive'
                });
            }
        } catch (error) {
            console.error('Erro ao traduzir mensagem:', error);
            toast({
                title: 'Erro na Tradução',
                description: 'Ocorreu um erro ao tentar traduzir.',
                variant: 'destructive'
            });
        } finally {
            setTranslateLoading(prev => ({ ...prev, [messageId]: false }));
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)]">
            <Card className="flex-1 flex flex-col animate-in fade-in-0 zoom-in-95 duration-500 border border-white/20 bg-white/10 backdrop-blur-[24px] shadow-[0_25px_60px_rgba(0,0,0,0.45)] md:rounded-2xl">
                <CardHeader className="border-b border-white/20 bg-white/10 flex flex-row items-center justify-between relative px-6 py-4">
                    <div className="flex items-center gap-3 flex-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push('/admin/conversations')}
                            className="text-white/80 hover:bg-white/20 hover:text-white"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={userInfo?.photoURL} alt={userInfo?.displayName} />
                            <AvatarFallback>
                                {userInfo?.displayName?.charAt(0) || 'U'}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="text-lg text-white/95 tracking-tight font-semibold">
                                {userInfo?.displayName || 'Carregando...'}
                            </div>
                            {userInfo?.email && (
                                <p className="text-xs text-white/70">{userInfo.email}</p>
                            )}
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleVideoCall}
                        className="text-white/80 hover:bg-white/20 hover:text-white flex items-center gap-2"
                    >
                        <Video className="h-4 w-4" />
                        Videochamada
                    </Button>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/20 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-white/60">
                            <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
                            <p className="text-center">Nenhuma mensagem ainda</p>
                            <p className="text-sm opacity-75 max-w-xs text-center mt-2">Envie uma mensagem para iniciar a conversa</p>
                        </div>
                    ) : (
                        messages.map((message) => {
                            const isAdmin = message.senderId === 'admin';
                            return (
                                <div
                                    key={message.id}
                                    className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[70%] rounded-lg p-3 ${
                                            isAdmin
                                                ? 'bg-white/30 text-white rounded-br-sm border border-white/20'
                                                : 'bg-white/20 text-white rounded-bl-sm border border-white/15'
                                        }`}
                                    >
                                        {message.imageUrl && (
                                            <>
                                            { }
                                            <img
                                                src={message.imageUrl}
                                                alt="Imagem"
                                                className="max-w-full rounded mb-2 cursor-pointer hover:opacity-90"
                                                onClick={() => window.open(message.imageUrl, '_blank')}
                                            />
                                            </>
                                        )}
                                        {message.videoUrl && (
                                            <video
                                                src={message.videoUrl}
                                                controls
                                                className="max-w-full rounded mb-2"
                                            />
                                        )}
                                        {message.fileUrl && (
                                            <a
                                                href={message.fileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 text-blue-500 hover:underline mb-2"
                                            >
                                                <FileText className="h-4 w-4" />
                                                {message.fileName || 'Arquivo'}
                                            </a>
                                        )}
                                        {message.isCharge && message.hasLockedMedia ? (
                                            <div className="border border-amber-400 bg-amber-50 dark:bg-amber-950 rounded p-3 mb-2">
                                                <p className="text-xs font-semibold text-amber-700 dark:text-amber-200 mb-2">
                                                    🔒 Mídia Bloqueada - Pagar para Desbloquear
                                                </p>
                                                {message.lockedMediaType === 'image' && (
                                                    <div className="max-w-xs mb-2 relative overflow-hidden rounded">
                                                        <img
                                                            src={message.lockedMediaUrl}
                                                            alt="Mídia bloqueada"
                                                            className="max-w-full blur-lg opacity-50"
                                                        />
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <span className="bg-black/60 text-white px-4 py-2 rounded">
                                                                🔒 Bloqueado
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                                {message.lockedMediaType === 'video' && (
                                                    <div className="max-w-xs mb-2 relative overflow-hidden rounded">
                                                        <video
                                                            src={message.lockedMediaUrl}
                                                            className="max-w-full blur-lg opacity-50"
                                                        />
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <span className="bg-black/60 text-white px-4 py-2 rounded">
                                                                🔒 Bloqueado
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                                <p className="text-xs text-amber-600 dark:text-amber-300">
                                                    {message.lockedMediaName}
                                                </p>
                                            </div>
                                        ) : null}
                                        {message.isLocation && message.latitude && message.longitude ? (
                                            <div className="flex items-center gap-2">
                                                <a
                                                    href={`https://www.google.com/maps?q=${message.latitude},${message.longitude}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 hover:underline"
                                                >
                                                    <MapPin className="h-4 w-4" />
                                                    {translatedMessages[message.id] ? translatedMessages[message.id] : message.text}
                                                </a>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleTranslateMessage(message.id, message.text)}
                                                    disabled={translateLoading[message.id]}
                                                    className="h-6 w-6 p-0"
                                                    title={translatedMessages[message.id] ? 'Remover tradução' : 'Traduzir'}
                                                >
                                                    {translateLoading[message.id] ? (
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                    ) : (
                                                        <Globe className={`h-3 w-3 ${translatedMessages[message.id] ? 'text-blue-500' : ''}`} />
                                                    )}
                                                </Button>
                                            </div>
                                        ) : (
                                            <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                                        )}
                                        <p className="text-xs opacity-70 mt-1">
                                            {message.timestamp && formatDistanceToNow(message.timestamp.toDate(), {
                                                addSuffix: true,
                                                locale: ptBR
                                            })}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </CardContent>

                <div className="border-t border-white/20 bg-white/5 p-4 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
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
                            variant="ghost"
                            size="icon"
                            onClick={() => imageInputRef.current?.click()}
                            disabled={isUploading}
                            title="Enviar Imagem"
                            className="text-white/80 hover:bg-white/15 hover:text-white"
                        >
                            <ImageIcon className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => videoInputRef.current?.click()}
                            disabled={isUploading}
                            title="Enviar Vídeo"
                            className="text-white/80 hover:bg-white/15 hover:text-white"
                        >
                            <Video className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            title="Enviar Arquivo"
                            className="text-white/80 hover:bg-white/15 hover:text-white"
                        >
                            <Paperclip className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleSendLocation}
                            disabled={isUploading}
                            title="Enviar Localização"
                            className="text-white/80 hover:bg-white/15 hover:text-white"
                        >
                            <MapPin className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleSendCharge}
                            disabled={isUploading}
                            title="Enviar Cobrança"
                            className="text-white/80 hover:bg-white/15 hover:text-white"
                        >
                            <DollarSign className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                const textToCopy = newMessage || 'mensagem de teste';
                                handleTranslateMessage('temp-' + Date.now(), textToCopy);
                            }}
                            disabled={isUploading}
                            title="Traduzir Mensagem"
                            className="text-white/80 hover:bg-white/15 hover:text-white"
                        >
                            <Globe className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="flex items-center gap-3">
                        <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            placeholder="Digite sua mensagem..."
                            disabled={isSending || isUploading}
                            className="flex-1 bg-white/10 border border-white/20 text-white placeholder-white/50 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
                        />
                        <Button
                            onClick={handleSendMessage}
                            disabled={isSending || isUploading || !newMessage.trim()}
                            className="bg-white/20 text-white hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed p-3 rounded-lg transition-colors"
                        >
                            {isSending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                    </div>

                    {isUploading && (
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Enviando arquivo...
                        </p>
                    )}
                </div>
            </Card>

            <VideoRoom
                open={isVideoRoomOpen}
                onOpenChange={setIsVideoRoomOpen}
                peerUid={userInfo?.uid}
            />

            <Dialog open={isChargeDialogOpen} onOpenChange={setIsChargeDialogOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Enviar Cobrança</DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="charge-amount">Valor da Cobrança (R$)</Label>
                            <Input
                                id="charge-amount"
                                type="number"
                                placeholder="50.00"
                                value={chargeAmount}
                                onChange={(e) => setChargeAmount(e.target.value)}
                                step="0.01"
                                min="0"
                                disabled={isUploading}
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label htmlFor="charge-media">Mídia para Desbloquear (Opcional)</Label>
                            <p className="text-xs text-muted-foreground mb-2">
                                Imagem, vídeo ou arquivo que será bloqueado até o pagamento
                            </p>
                            <input
                                ref={chargeMediaInputRef}
                                id="charge-media"
                                type="file"
                                accept="image/*,video/*,application/*"
                                className="hidden"
                                onChange={handleChargeMediaSelect}
                                disabled={isUploading}
                            />
                            <Button
                                variant="outline"
                                onClick={() => chargeMediaInputRef.current?.click()}
                                disabled={isUploading}
                                className="w-full"
                            >
                                {chargeMediaName ? `✓ ${chargeMediaName}` : 'Selecionar Arquivo'}
                            </Button>
                        </div>

                        <div className="flex gap-2 pt-4">
                            <Button
                                variant="outline"
                                onClick={() => setIsChargeDialogOpen(false)}
                                disabled={isUploading}
                                className="flex-1"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSendChargeWithMedia}
                                disabled={!chargeAmount || isUploading}
                                className="flex-1"
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    'Enviar Cobrança'
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

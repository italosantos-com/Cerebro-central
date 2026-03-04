"use client";

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { collection, addDoc, Timestamp, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import ReviewsSection from '@/components/reviews/reviews-section';
import { useAuth } from '@/contexts/AuthProvider';
import { getPublicUsernameFromPathname } from '@/utils/public-admin-scope';
import { resolveAdminUidByUsername } from '@/utils/admin-lookup-client';

type ReviewsFormSectionProps = {
    sendToSecretChatEnabled?: boolean;
};

const ReviewsFormSection = ({ sendToSecretChatEnabled = true }: ReviewsFormSectionProps) => {
    const { toast } = useToast();
    const { user, userProfile } = useAuth();
    const [newReviewAuthor, setNewReviewAuthor] = useState('');
    const [newReviewText, setNewReviewText] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const isLoggedIn = Boolean(user);

    const resolvedAuthorName =
        userProfile?.displayName ||
        user?.displayName ||
        user?.email?.split('@')[0] ||
        'Usuário';

    const resolvedAuthorPhoto =
        userProfile?.photoURL ||
        user?.photoURL ||
        '';

    useEffect(() => {
        if (isLoggedIn) {
            setNewReviewAuthor(resolvedAuthorName);
        }
    }, [isLoggedIn, resolvedAuthorName]);

    const getOrCreateSecretChatId = () => {
        if (globalThis.window === undefined) return '';

        const pathname = globalThis.window.location.pathname;
        const publicUsername = getPublicUsernameFromPathname(pathname);
        const normalizedScope = (publicUsername ?? '').trim().toLowerCase();
        const safeScope = normalizedScope ? normalizedScope.replaceAll(/[^a-z0-9_-]/g, '').slice(0, 40) : '';
        const storageKey = safeScope ? `secretChatId:${safeScope}` : 'secretChatId';

        let chatId = localStorage.getItem(storageKey);
        if (!chatId) {
            const randomId = Math.random().toString(36).substring(2, 8);
            chatId = safeScope ? `secret-chat-${safeScope}-${randomId}` : `secret-chat-${randomId}`;
            localStorage.setItem(storageKey, chatId);
        }
        return chatId;
    };

    const sendReviewToSecretChat = async (authorName: string, reviewText: string) => {
        try {
            const chatId = getOrCreateSecretChatId();
            if (!chatId) return;

            const pathname = globalThis.window?.location?.pathname || '';
            const publicUsername = getPublicUsernameFromPathname(pathname);
            const adminUid = publicUsername ? await resolveAdminUidByUsername(publicUsername) : null;

            const chatDocRef = doc(db, 'chats', chatId);
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

            await addDoc(collection(chatDocRef, 'messages'), {
                senderId: 'admin',
                text: `Avaliação recebida de ${authorName}: ${reviewText}`,
                timestamp: serverTimestamp(),
                imageUrl: '',
                videoUrl: '',
                isLocation: false,
                source: 'review'
            });
        } catch (error) {
            if (process.env.NODE_ENV !== 'production') {
                console.warn('[Reviews] Falha ao enviar avaliação para chat secreto:', error);
            }
        }
    };

    const handleAddReview = async () => {
        const authorName = isLoggedIn ? resolvedAuthorName : newReviewAuthor.trim();

        if (!authorName || !newReviewText) {
            toast({ variant: 'destructive', title: 'Por favor, preencha nome e comentário.' });
            return;
        }
        setIsSubmittingReview(true);
        try {
            await addDoc(collection(db, "reviews"), {
                author: authorName,
                authorUid: user?.uid || null,
                authorPhotoUrl: resolvedAuthorPhoto || null,
                text: newReviewText,
                status: 'pending',
                createdAt: Timestamp.now(),
            });
            if (sendToSecretChatEnabled) {
                await sendReviewToSecretChat(authorName, newReviewText);
            }
            toast({ title: 'Comentário enviado para moderação!' });
            if (!isLoggedIn) {
                setNewReviewAuthor('');
            }
            setNewReviewText('');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao enviar comentário.' });
        } finally {
            setIsSubmittingReview(false);
        }
    };

    return (
        <div className="px-4 md:px-8 py-12 bg-background flex flex-col items-center">
            <div className="max-w-4xl w-full mx-auto">
                {/* Fontes das Avaliações */}
                <div className="text-center mb-10 p-6 bg-card/50 backdrop-blur-sm rounded-lg border border-primary/30">
                    <p className="text-base font-semibold mb-3 text-primary">
                        ✅ Avaliações verificadas de clientes reais
                    </p>
                    <div className="flex flex-wrap justify-center gap-6 text-sm">
                    </div>
                </div>
                
                <Card className="w-full max-w-2xl p-6 md:p-8 bg-card/50 backdrop-blur-sm border-primary/30 mb-8 mx-auto shadow-lg">
                    <h3 className="text-xl md:text-2xl font-semibold mb-6 text-primary">Deixe sua avaliação</h3>
                    <div className="space-y-4">
                        <Input 
                            placeholder="Seu nome"
                            value={newReviewAuthor}
                            onChange={(e) => setNewReviewAuthor(e.target.value)}
                            disabled={isLoggedIn}
                        />
                        <Textarea 
                            placeholder="Escreva seu comentário aqui..."
                            value={newReviewText}
                            onChange={(e) => setNewReviewText(e.target.value)}
                        />
                        <Button onClick={handleAddReview} disabled={isSubmittingReview}>
                            {isSubmittingReview ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Enviar Comentário
                        </Button>
                    </div>
                </Card>
                
                <ReviewsSection title="Avaliações" showStars />
            </div>
        </div>
    );
};

export default ReviewsFormSection;

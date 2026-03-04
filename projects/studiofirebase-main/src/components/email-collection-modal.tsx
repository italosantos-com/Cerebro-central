"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { updateEmail } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';

interface EmailCollectionModalProps {
    isOpen: boolean;
    onEmailCollected: (email: string) => void;
}

export default function EmailCollectionModal({ isOpen, onEmailCollected }: EmailCollectionModalProps) {
    const { toast } = useToast();
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email.trim()) {
            toast({
                variant: 'destructive',
                title: 'Email obrigatório',
                description: 'Por favor, insira seu email para continuar.'
            });
            return;
        }

        if (!validateEmail(email)) {
            toast({
                variant: 'destructive',
                title: 'Email inválido',
                description: 'Por favor, insira um email válido.'
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error('Usuário não autenticado');
            }

            // Atualizar email no Firebase Auth
            await updateEmail(user, email);

            // Atualizar email no Firestore
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, {
                email: email,
                emailVerified: false,
                lastSync: new Date().toISOString()
            });

            // Salvar no localStorage
            try {
                localStorage.setItem('customerEmail', email);
                localStorage.setItem('isAuthenticated', 'true');
            } catch { }

            toast({
                title: 'Email registrado!',
                description: 'Seu email foi salvo com sucesso. Agora você pode acessar todos os recursos.'
            });

            onEmailCollected(email);
        } catch (error: any) {
            console.error('Erro ao salvar email:', error);

            let errorMessage = 'Não foi possível salvar o email. Tente novamente.';

            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'Este email já está em uso por outra conta.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Email inválido.';
            } else if (error.code === 'auth/requires-recent-login') {
                errorMessage = 'Por segurança, faça login novamente antes de atualizar o email.';
            }

            toast({
                variant: 'destructive',
                title: 'Erro ao salvar email',
                description: errorMessage
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={() => { }}>
            <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
                <DialogHeader>
                    <div className="flex items-center justify-center mb-4">
                        <div className="bg-primary/10 p-3 rounded-full">
                            <Mail className="h-8 w-8 text-primary" />
                        </div>
                    </div>
                    <DialogTitle className="text-center text-2xl">
                        Precisamos do seu email
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        Para liberar o acesso aos métodos de pagamento e garantir a segurança da sua conta, precisamos confirmar seu email.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800 dark:text-amber-200">
                            <strong>Importante:</strong> Este email será usado para recuperação de conta e notificações importantes.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium">
                            Email
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isSubmitting}
                            required
                            autoFocus
                            className="h-11"
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-11"
                        disabled={isSubmitting || !email.trim()}
                    >
                        {isSubmitting ? 'Salvando...' : 'Confirmar Email'}
                    </Button>

                    <p className="text-xs text-center text-muted-foreground">
                        Ao continuar, você concorda em receber comunicações importantes sobre sua conta.
                    </p>
                </form>
            </DialogContent>
        </Dialog>
    );
}

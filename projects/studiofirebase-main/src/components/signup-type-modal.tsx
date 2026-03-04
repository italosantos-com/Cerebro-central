"use client";

import { useState } from "react";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Apple, FingerprintPattern as Fingerprint, Mail, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { getSocialLoginErrorMessage, signInWithSocialProvider } from '@/lib/social-auth';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import Image from 'next/image';

interface SignUpTypeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SignUpTypeModal({ isOpen, onClose }: SignUpTypeModalProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState<string | null>(null);

    if (!isOpen) return null;

    async function signInWithGoogle() {
        try {
            setLoading('google');
            const { displayName } = await signInWithSocialProvider('google');

            toast({
                title: 'Conectado com Google',
                description: `Bem-vindo, ${displayName}!`
            });
            onClose();
        } catch (e: any) {
            console.warn('[SignUp Google] Falha no login:', e);
            const errorMessage = getSocialLoginErrorMessage(e, 'google');

            toast({
                variant: 'destructive',
                title: 'Falha no login com Google',
                description: errorMessage
            });
        } finally {
            setLoading(null);
        }
    }

    async function signInWithApple() {
        try {
            setLoading('apple');
            const { displayName } = await signInWithSocialProvider('apple');

            toast({
                title: 'Conectado com Apple',
                description: `Bem-vindo, ${displayName}!`
            });
            onClose();
        } catch (e: any) {
            console.warn('[SignUp Apple] Falha no login:', e);
            const errorMessage = getSocialLoginErrorMessage(e, 'apple');

            toast({
                variant: 'destructive',
                title: 'Falha no login com Apple',
                description: errorMessage
            });
        } finally {
            setLoading(null);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogTitle className="hidden">Opções de Cadastro</DialogTitle>
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[1003] p-4 sm:p-6">
                    <Card className="w-full max-w-[450px] mx-4 shadow-xl border-2 border-primary/50 bg-background">
                        <CardHeader className="text-center pb-3 pt-5 sm:pb-4 sm:pt-6">
                            <CardTitle className="text-2xl sm:text-3xl font-bold text-primary mb-2">
                                Como deseja se cadastrar?
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="absolute top-4 right-4 sm:top-6 sm:right-6 h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground hover:text-primary"
                            >
                                <X className="h-5 w-5 sm:h-6 sm:w-6" />
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-2 sm:space-y-2.5 px-6 sm:px-10 pb-5 sm:pb-6">
                            <div className="flex items-center justify-center gap-4">
                                <button
                                    type="button"
                                    onClick={signInWithApple}
                                    disabled={loading === 'apple'}
                                    className="flex flex-col items-center justify-center transition-transform hover:scale-110 disabled:opacity-50"
                                    aria-label="Cadastrar com Apple"
                                >
                                    {loading === 'apple' ? (
                                        <Loader2 className="w-12 h-12 sm:w-14 sm:h-14 animate-spin" aria-label="Carregando" />
                                    ) : (
                                        <Image
                                            src="/apple-icon.svg"
                                            alt="Apple"
                                            width={48}
                                            height={48}
                                            className="w-12 h-12 sm:w-14 sm:h-14"
                                        />
                                    )}
                                </button>
                                <Link
                                    href="/auth/face"
                                    onClick={(e) => {
                                        if (loading !== null) {
                                            e.preventDefault();
                                            return;
                                        }
                                        onClose();
                                    }}
                                    className={`flex flex-col items-center justify-center transition-transform hover:scale-110 ${loading !== null ? 'opacity-50 pointer-events-none' : ''}`}
                                    aria-label="Cadastrar com Face ID"
                                    aria-disabled={loading !== null}
                                    tabIndex={loading !== null ? -1 : undefined}
                                >
                                    <Image
                                        src="/faceid-icon.svg"
                                        alt="Face ID"
                                        width={48}
                                        height={48}
                                        className="w-12 h-12 sm:w-14 sm:h-14"
                                    />
                                </Link>
                                <button
                                    type="button"
                                    onClick={signInWithGoogle}
                                    disabled={loading === 'google'}
                                    className="flex flex-col items-center justify-center transition-transform hover:scale-110 disabled:opacity-50"
                                    aria-label="Cadastrar com Google"
                                >
                                    {loading === 'google' ? (
                                        <Loader2 className="w-12 h-12 sm:w-14 sm:h-14 animate-spin" aria-label="Carregando" />
                                    ) : (
                                        <Image
                                            src="/google-icon.svg"
                                            alt="Google"
                                            width={48}
                                            height={48}
                                            className="w-12 h-12 sm:w-14 sm:h-14"
                                        />
                                    )}
                                </button>
                            </div>
                            <div className="text-center text-muted-foreground text-xs sm:text-sm pt-2 border-t border-border">
                                <p>Você pode alterar o método depois nas configurações de perfil.</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </DialogContent>
        </Dialog>
    );
}

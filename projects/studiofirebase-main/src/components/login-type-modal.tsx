"use client";

import { Button } from '@/components/ui/button';
import { ShieldCheck, User, X } from 'lucide-react';
import Link from 'next/link';

interface LoginTypeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function LoginTypeModal({ isOpen, onClose }: LoginTypeModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[1003] p-4 sm:p-6">
            <div className="relative w-full max-w-[450px] mx-4 space-y-2 sm:space-y-2.5 bg-black/95 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                {/* Botão Fechar */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="absolute -top-12 right-0 h-10 w-10 text-white hover:text-primary hover:bg-white/10 z-10"
                >
                    <X className="h-6 w-6" />
                </Button>

                {/* Login de Usuário Comum */}
                <Link href="/auth/face" onClick={onClose}>
                    <Button
                        className="w-full h-16 sm:h-20 bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-3 sm:gap-5 text-lg sm:text-xl font-medium shadow-2xl hover:shadow-neon-red-strong transition-all duration-300 hover:scale-[1.02]"
                    >
                        <User className="h-6 w-6 sm:h-7 sm:w-7" />
                        Acesso de Usuário
                    </Button>
                </Link>

                {/* Login Administrativo */}
                <Link href="/admin" onClick={onClose}>
                    <Button
                        variant="outline"
                        className="w-full h-16 sm:h-20 border-2 border-primary/50 bg-background/95 text-primary hover:text-white hover:bg-primary hover:border-primary flex items-center justify-center gap-3 sm:gap-5 text-lg sm:text-xl font-medium shadow-2xl hover:shadow-neon-white transition-all duration-300 hover:scale-[1.02]"
                    >
                        <ShieldCheck className="h-6 w-6 sm:h-7 sm:w-7" />
                        Acesso Administrativo
                    </Button>
                </Link>
            </div>
        </div>
    );
}

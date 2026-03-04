
"use client";

import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { MessageSquare, X } from 'lucide-react';


interface SecretChatButtonProps {
    onClick: () => void;
    isChatOpen: boolean;
}

export default function SecretChatButton({ onClick, isChatOpen }: SecretChatButtonProps) {
    // Esconder o botão quando o chat estiver aberto
    if (isChatOpen) return null;
    
    return (
       <div
            className={cn(
                "fixed bottom-6 left-6 z-40 flex flex-col items-center gap-2"
            )}
       >
            <button
                onClick={onClick}
                aria-label={isChatOpen ? "Fechar Chat Secreto" : "Abrir Chat Secreto"}
                className={cn(
                    "relative h-[68px] w-[68px] transition-all duration-300 group rounded-full border border-white/10 hover:scale-[1.06] shadow-secret-chat"
                )}
                style={{
                    backgroundColor: 'var(--app-secret-chat-color)'
                }}
            >
                {/* Glow effect for iOS-style depth */}
                <span
                    aria-hidden
                    className={cn(
                        'pointer-events-none absolute -inset-6 rounded-full blur-[38px] opacity-90 -z-10',
                        'transition-[opacity,filter] duration-200',
                        'group-hover:blur-[52px] group-hover:opacity-100'
                    )}
                    style={{
                        background: 'color-mix(in srgb, var(--app-secret-chat-color) 35%, transparent)'
                    }}
                />
                <span
                    aria-hidden
                    className={cn(
                        'pointer-events-none absolute -inset-2 rounded-full opacity-90 -z-10',
                        'ring-1 ring-white/25',
                        'transition-[opacity,box-shadow] duration-200',
                        'group-hover:opacity-100'
                    )}
                />
                {isChatOpen ? (
                    <div className="flex items-center justify-center h-full w-full rounded-full">
                        <X className="h-10 w-10" style={{ color: 'var(--app-secret-chat-foreground)' }} />
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full w-full rounded-full">
                        <MessageSquare className="h-10 w-10" style={{ color: 'var(--app-secret-chat-foreground)' }} />
                    </div>
                )}
            </button>
       </div>
    );
}

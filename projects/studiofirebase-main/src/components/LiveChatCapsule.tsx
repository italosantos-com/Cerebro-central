"use client";

import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useProfileSettings } from '@/hooks/use-profile-settings';
import { useUserAuth } from '@/hooks/use-user-auth';
import dynamic from 'next/dynamic';

// Dynamically import SecretChatWidget (full-featured chat with location, images, and video) to avoid SSR issues
const SecretChatWidget = dynamic(() => import('@/components/secret-chat-widget'), {
  ssr: false
});

/**
 * Componente LiveChatCapsule
 * Um botão flutuante com efeito ultra-glass, ícone quadrado e indicador neon.
 * Abre o chat secreto quando clicado.
 */
const LiveChatCapsule = () => {
  const pathname = usePathname();
  const { settings } = useProfileSettings();
  const { user } = useUserAuth();
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Check if chat button should be shown - using separate setting from WhatsApp
  const showChatButton = settings?.showLiveChatButton ?? true;

  // Don't show on admin or auth pages, or if disabled
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/auth') || !showChatButton) {
    return null;
  }

  const handleChatClick = () => {
    if (!user) {
      window.location.href = '/auth?mode=register';
      return;
    }
    setIsChatOpen(!isChatOpen);
  };

  return (
    <>
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50">
        <button
          onClick={handleChatClick}
          className="
            /* Efeito de Vidro e Layout */
            bg-white/[0.05] backdrop-blur-[40px] border border-white/10 
            p-2 pr-12 pl-3 rounded-full flex items-center gap-5 
            
            /* Sombra e Interação */
            shadow-[0_25px_60px_rgba(0,0,0,0.8)] 
            hover:bg-white/[0.08] hover:border-white/20 
            transition-all duration-500 group active:scale-95
          "
        >
          {/* Container do Ícone Quadrado (Vidro Interno) */}
          <div className="
            w-16 h-16 bg-white/[0.1] backdrop-blur-xl border border-white/20 
            rounded-full flex items-center justify-center shadow-inner 
            group-hover:scale-105 transition-transform duration-500
          ">
            <MessageSquare
              size={32}
              className="text-white/80"
              strokeWidth={2.5}
            />
          </div>

          {/* Bloco de Texto Simétrico */}
          <div className="flex flex-col items-start leading-none gap-1">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-white/90 tracking-tighter uppercase">
                AO
              </span>

              {/* Indicador Neon Verde */}
              <div className="
                w-2.5 h-2.5 bg-[#10b981] rounded-full animate-pulse-neon 
                shadow-[0_0_12px_rgba(16,185,129,0.8)]
              "></div>
            </div>

            <span className="text-xl font-black text-white/90 tracking-tighter uppercase">
              VIVO
            </span>
          </div>
        </button>

        {/* Estilos Globais necessários para a animação de pulso */}
        <style dangerouslySetInnerHTML={{
          __html: `
          @keyframes pulse-neon {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.1); }
          }
          .animate-pulse-neon {
            animation: pulse-neon 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
        `}} />
      </div>

      {/* Secret Chat Widget - janela flutuante completa com mensagens, avatares, localização e upload */}
      {isChatOpen && (
        <SecretChatWidget
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </>
  );
};

export default LiveChatCapsule;

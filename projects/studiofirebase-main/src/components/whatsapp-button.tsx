
"use client";

import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { useProfileSettings } from '@/hooks/use-profile-settings';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';

export default function WhatsAppButton() {
  const pathname = usePathname();
  const { settings } = useProfileSettings();
  
  // Usar o número do campo phone das configurações do admin
  const phoneNumber = settings?.phone || '5521990479104';
  const whatsappUrl = `https://wa.me/${phoneNumber}`;
  
  // Check if WhatsApp button should be shown
  const showWhatsappButton = settings?.showWhatsappButton ?? true;
  
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/auth') || !showWhatsappButton) {
    return null;
  }

  return (
    <a 
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
                        "fixed bottom-6 right-6 z-40 flex items-center justify-center group",
        )}
        aria-label="Fale conosco no WhatsApp"
    >
            <div
              className={cn(
                'relative isolate h-[68px] w-[68px] rounded-full border border-white/10 flex items-center justify-center',
                'whatsapp-bubble transition-[transform,box-shadow] duration-200',
                'group-hover:scale-[1.06]'
              )}
              style={{ color: 'var(--app-whatsapp-bubble-foreground)' }}
            >
        {/* Camadas de glow (neon branco) ao redor do balão */}
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute -inset-6 rounded-full blur-[38px] opacity-90 -z-10',
            'whatsapp-bubble-glow transition-[opacity,filter] duration-200',
            'group-hover:blur-[52px] group-hover:opacity-100'
          )}
        />
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute -inset-2 rounded-full opacity-90 -z-10',
            'ring-1 ring-white/25',
            'whatsapp-bubble-ring transition-[opacity,box-shadow] duration-200',
            'group-hover:opacity-100'
          )}
        />

        <WhatsAppIcon className="relative z-10 h-10 w-10" />
            </div>
    </a>
  );
}

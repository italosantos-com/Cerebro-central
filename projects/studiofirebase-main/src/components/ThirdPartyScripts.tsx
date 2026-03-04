"use client";

import { usePathname } from 'next/navigation';
import Script from 'next/script';
import FacebookSDK from '@/components/FacebookSDK';
import WhatsAppButton from '@/components/whatsapp-button';
import LiveChatCapsule from '@/components/LiveChatCapsule';
import ScreenProtector from '@/components/screen-protector';
import ServiceWorkerRegister from '@/components/pwa/ServiceWorkerRegister';

export default function ThirdPartyScripts() {
  const pathname = usePathname();
  const isAdminConversation = pathname?.startsWith('/admin/conversations') || pathname?.startsWith('/admin/chat/');

  if (isAdminConversation) {
    return null;
  }

  return (
    <>
      <FacebookSDK />
      <div id="fb-root"></div>

      <Script id="google-pay-script" strategy="afterInteractive">
        {`
          (function() {
            var script = document.createElement('script');
            script.src = 'https://pay.google.com/gp/p/js/pay.js';
            script.onload = function() {
              window.dispatchEvent(new Event('google-pay-ready'));
            };
            script.onerror = function() {
              // Silenciar erro de carregamento do Google Pay
            };
            document.head.appendChild(script);
          })();
        `}
      </Script>

      <WhatsAppButton />
      <LiveChatCapsule />
      <ScreenProtector />
      <ServiceWorkerRegister />
    </>
  );
}

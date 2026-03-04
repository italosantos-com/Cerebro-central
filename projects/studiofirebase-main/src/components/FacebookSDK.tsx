'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';

export default function FacebookSDK() {
  const pathname = usePathname();
  const isAdminConversation = pathname?.startsWith('/admin/conversations') || pathname?.startsWith('/admin/chat/');
  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;

  if (isAdminConversation) {
    return null;
  }

  if (!appId) {
    console.warn('[FacebookSDK] NEXT_PUBLIC_FACEBOOK_APP_ID não configurado');
    return null;
  }

  return (
    <>
      <Script id="facebook-sdk-inline" strategy="afterInteractive">
        {`
          console.log('[FacebookSDK] 🚀 Iniciando carregamento do SDK');
          console.log('[FacebookSDK] App ID:', '${appId}');
          console.log('[FacebookSDK] Domínio atual:', window.location.origin);
          
          window.fbAsyncInit = function() {
            try {
              console.log('[FacebookSDK] ✅ fbAsyncInit callback executado');
              
              FB.init({
                appId            : '${appId}',
                autoLogAppEvents : true,
                xfbml            : true,
                version          : 'v24.0'
              });
              
              console.log('[FacebookSDK] ✅ FB.init concluído');
              FB.AppEvents.logPageView();
              console.log('[FacebookSDK] ✅ SDK totalmente inicializado e pronto');
              
              // Disparar evento customizado para notificar que o SDK está pronto
              window.dispatchEvent(new Event('facebook-sdk-ready'));
            } catch (error) {
              console.error('[FacebookSDK] ❌ Erro durante inicialização:', error);
            }
          };

          (function(d, s, id){
             console.log('[FacebookSDK] 📥 Injetando script do SDK...');
             
             var js, fjs = d.getElementsByTagName(s)[0];
             
             // Verificar se já existe
             if (d.getElementById(id)) {
               console.warn('[FacebookSDK] ⚠️ Script', id, 'já existe no DOM');
               
               // Se o script já existe mas FB não está disponível, pode estar com erro
               if (!window.FB) {
                 console.error('[FacebookSDK] ❌ Script existe mas window.FB não está disponível');
                 console.error('[FacebookSDK] Isso pode indicar bloqueio, erro 403, ou problema de rede');
               }
               return;
             }
             
             js = d.createElement(s); 
             js.id = id;
             js.src = "https://connect.facebook.net/en_US/sdk.js";
             
             // Handlers para sucesso/erro
             js.onload = function() {
               console.log('[FacebookSDK] ✅ Script carregado com sucesso');
             };
             
             js.onerror = function(error) {
               console.error('[FacebookSDK] ❌ ERRO ao carregar script:', error);
               console.error('[FacebookSDK] Possíveis causas:');
               console.error('[FacebookSDK] 1. Bloqueador de anúncios ativo');
               console.error('[FacebookSDK] 2. Domínio não autorizado no Facebook App');
               console.error('[FacebookSDK] 3. Problema de rede/firewall');
               console.error('[FacebookSDK] 4. Facebook SDK temporariamente indisponível');
               
               // Disparar evento de erro
               window.dispatchEvent(new CustomEvent('facebook-sdk-error', { 
                 detail: { message: 'Falha ao carregar SDK do Facebook' }
               }));
             };
             
             fjs.parentNode.insertBefore(js, fjs);
             console.log('[FacebookSDK] 📤 Script injetado no DOM');
           }(document, 'script', 'facebook-jssdk'));
        `}
      </Script>
    </>
  );
}

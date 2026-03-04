import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import '@/styles/braintree.css';
import '@/styles/ios-system.css';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import Script from 'next/script';
import { ConditionalProviders } from '@/components/ConditionalProviders';
import ThirdPartyScripts from '@/components/ThirdPartyScripts';
import AppearanceThemeApplier from '@/components/AppearanceThemeApplier';
import ErrorReporter from '@/components/ErrorReporter';
import '@/lib/error-suppressor';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Italo Santos',
  description: 'Sistema profissional de autenticação e pagamentos.',
  icons: {
    icon: [
      {
        url: '/logo.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        url: '/logo.png',
        sizes: '16x16',
        type: 'image/png',
      }
    ],
    apple: [
      {
        url: '/logo.png',
        sizes: '180x180',
        type: 'image/png',
      }
    ]
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <head>
        <meta name="google-site-verification" content="nNTGRg0N1SPYHaG_RFKS_4lEvEMvsR4sI9FF7n1683o" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0a84ff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0a84ff" media="(prefers-color-scheme: dark)" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Italo Santos" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <link rel="apple-touch-startup-image" href="/icon.png" />
        <Script id="error-handler" strategy="beforeInteractive">
          {`
            // Capturar erros de segurança cross-origin e outros erros relacionados a iframes
            window.addEventListener('error', function(event) {
              if (event.message && event.message.includes('cross-origin')) {
                // Silenciar erros de cross-origin
                event.preventDefault();
                return false;
              }
            });
            
            // Capturar erros de segurança específicos
            window.addEventListener('securitypolicyviolation', function(event) {
              // Silenciar violações de política de segurança
            });
            
            // Capturar erros de Firebase e silenciar alguns
            window.addEventListener('unhandledrejection', function(event) {
              if (event.reason && event.reason.message && 
                  (event.reason.message.includes('Missing or insufficient permissions') ||
                   event.reason.message.includes('FirebaseError'))) {
                // Silenciar erros de permissão do Firebase em desenvolvimento
                event.preventDefault();
                return false;
              }
            });
          `}
        </Script>

        {process.env.NODE_ENV !== 'production' && (
          <Script id="dev-sw-reset" strategy="beforeInteractive">
            {`
              (function() {
                try {
                  // Evita loops de reload: roda no máximo 1x por aba
                  if (sessionStorage.getItem('__dev_sw_reset_done__') === 'true') return;
                  sessionStorage.setItem('__dev_sw_reset_done__', 'true');

                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(function(regs) {
                      if (!regs || regs.length === 0) return;
                      console.info('[DEV SW RESET] Registrations:', regs.length);
                      return Promise.all(regs.map(function(r) { return r.unregister(); }));
                    }).then(function() {
                      if ('caches' in window) {
                        return caches.keys().then(function(keys) {
                          return Promise.all(keys.map(function(k) { return caches.delete(k); }));
                        });
                      }
                    }).then(function() {
                      // Se a página estava sendo controlada por SW antigo, recarrega 1x
                      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                        console.info('[DEV SW RESET] Reloading after unregister');
                        window.location.reload();
                      }
                    }).catch(function(err) {
                      console.warn('[DEV SW RESET] Failed', err);
                    });
                  }
                } catch (e) {
                  // silencioso
                }
              })();
            `}
          </Script>
        )}
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-background`} suppressHydrationWarning>
        {/* GTM desabilitado - substituir GTM-XXXXXXX por ID real quando disponível */}
        {/* <Script id="google-tag-manager" strategy="afterInteractive">
          {`
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','GTM-XXXXXXX');
            `}
        </Script>

        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          ></iframe>
        </noscript> */}

        <ConditionalProviders>
          <AppearanceThemeApplier />
          {children}
          <ThirdPartyScripts />
        </ConditionalProviders>
        <ErrorReporter />
        <Toaster />
        <Sonner />
      </body>
    </html>
  );
}

'use client';

import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Inter } from 'next/font/google';
import Layout from '@/components/layout/layout';
import WhatsAppButton from '@/components/whatsapp-button';
import Script from 'next/script';
import ScreenProtector from '@/components/screen-protector';
import { FaceIDAuthProvider } from '@/contexts/face-id-auth-context';
import { AuthProvider } from '@/contexts/AuthProvider';
import { usePathname } from 'next/navigation';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-sans',
});

function ConditionalProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Se for rota admin, não usar os providers de autenticação normal
  if (pathname?.startsWith('/admin')) {
    return <>{children}</>;
  }
  
  // Para outras rotas, usar os providers normais
  return (
    <AuthProvider>
      <FaceIDAuthProvider>
        <Layout>
          {children}
        </Layout>
      </FaceIDAuthProvider>
    </AuthProvider>
  );
}

export const metadata = {
  title: 'Italo Santos',
  description: 'Sistema profissional de autenticação e pagamentos.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <head>
        <Script id="error-handler" strategy="beforeInteractive">
          {`
            // Capturar erros de segurança cross-origin e outros erros relacionados a iframes
            window.addEventListener('error', function(event) {
              if (event.message && event.message.includes('cross-origin')) {
        
                event.preventDefault();
                return false;
              }
            });
            
            // Capturar erros de segurança específicos
            window.addEventListener('securitypolicyviolation', function(event) {
      
            });
          `}
        </Script>
      </head>
      <body className={`font-sans ${inter.variable} antialiased bg-background`}>
        <Script id="google-tag-manager" strategy="afterInteractive">
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
        </noscript>
        
        <div id="fb-root"></div>
        <Script id="facebook-jssdk" strategy="afterInteractive">
          {`
            window.fbAsyncInit = function() {
              FB.init({
                appId      : '3924094051199143',
                cookie     : true,
                xfbml      : true,
                version    : 'v23.0'
              });
              
              FB.AppEvents.logPageView();
              
            };

            (function(d, s, id){
               var js, fjs = d.getElementsByTagName(s)[0];
               if (d.getElementById(id)) {return;}
               js = d.createElement(s); js.id = id;
               js.src = "https://connect.facebook.net/en_US/sdk.js";
               fjs.parentNode.insertBefore(js, fjs);
             }(document, 'script', 'facebook-jssdk'));
          `}
        </Script>
        
        {/* Google Pay Script */}
        <Script id="google-pay-script" strategy="afterInteractive">
          {`
            // Carregar Google Pay API
            (function() {
              var script = document.createElement('script');
              script.src = 'https://pay.google.com/gp/p/js/pay.js';
              script.onload = function() {
        
                window.dispatchEvent(new Event('google-pay-ready'));
              };
              script.onerror = function() {
        
              };
              document.head.appendChild(script);
            })();
          `}
        </Script>
        
        <ConditionalProviders>
          {children}
        </ConditionalProviders>
        <Toaster />
        <Sonner />
        <WhatsAppButton />
        <ScreenProtector />
      </body>
    </html>
  );
}

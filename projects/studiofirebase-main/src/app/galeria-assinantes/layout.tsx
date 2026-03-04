import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Galeria Exclusiva - Italo Santos Studio',
  description: 'Conteúdo premium exclusivo para assinantes',
  robots: 'noindex, nofollow', // Não indexar no Google
}

export default function GaleriaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* Meta tags para forçar não-cache */}
      <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate, private" />
      <meta httpEquiv="Pragma" content="no-cache" />
      <meta httpEquiv="Expires" content="0" />
      <meta name="robots" content="noindex, nofollow" />
      <meta name="cache-control" content="no-cache, no-store, must-revalidate" />
      
      {/* Script para forçar não-cache - REMOVIDO REDIRECIONAMENTO AUTOMÁTICO */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // Forçar não-cache
            if (typeof window !== 'undefined') {
              // Limpar cache do navegador
              if ('caches' in window) {
                caches.keys().then(function(names) {
                  for (let name of names) caches.delete(name);
                });
              }
              
              // NÃO redirecionar automaticamente - deixar o middleware e componentes gerenciarem
              console.log('[Galeria Layout] Cache limpo, redirecionamento automático desabilitado');
            }
          `
        }}
      />
      
      {children}
    </>
  )
}

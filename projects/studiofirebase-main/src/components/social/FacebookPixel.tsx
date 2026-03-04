import React, { useEffect } from 'react';

interface FacebookPixelProps {
  pixelId?: string;
}

declare global {
  interface Window {
    fbq: (command: string, eventName: string, parameters?: Record<string, unknown>) => void;
  }
}

const FacebookPixel: React.FC<FacebookPixelProps> = ({
  pixelId = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID
}) => {
  useEffect(() => {
    if (!pixelId) {
      console.warn('Facebook Pixel ID não configurado');
      return;
    }

    // Função para inicializar o Facebook Pixel
    const initFacebookPixel = () => {
      // Verificar se o Facebook Pixel já foi carregado
      if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('init', pixelId);
        window.fbq('track', 'PageView');
        return;
      }

      // Verificar se o script já existe
      const existingScript = document.querySelector('script[src*="fbevents.js"]');
      if (existingScript) {
        return;
      }

      // Script do Facebook Pixel
      const script = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
      `;

      try {
        // Executar script
        const scriptElement = document.createElement('script');
        scriptElement.innerHTML = script;
        document.head.appendChild(scriptElement);

        // Aguardar um pouco para o script carregar
        setTimeout(() => {
          if (typeof window !== 'undefined' && window.fbq) {
            window.fbq('init', pixelId);
            window.fbq('track', 'PageView');
          }
        }, 100);
      } catch (error) {
        console.error('Erro ao carregar Facebook Pixel:', error);
      }
    };

    initFacebookPixel();
  }, [pixelId]);

  return null; // Este componente não renderiza nada visualmente
};

// Hook para rastrear eventos do Facebook
export const useFacebookPixel = () => {
  const trackEvent = (eventName: string, parameters?: Record<string, unknown>) => {
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', eventName, parameters);
    }
  };

  const trackCustomEvent = (eventName: string, parameters?: Record<string, unknown>) => {
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('trackCustom', eventName, parameters);
    }
  };

  const trackPurchase = (value: number, currency: string = 'USD') => {
    trackEvent('Purchase', {
      value: value,
      currency: currency
    });
  };

  const trackAddToCart = (contentName: string, value: number, currency: string = 'USD') => {
    trackEvent('AddToCart', {
      content_name: contentName,
      value: value,
      currency: currency
    });
  };

  const trackViewContent = (contentName: string, contentType?: string) => {
    trackEvent('ViewContent', {
      content_name: contentName,
      content_type: contentType
    });
  };

  const trackLead = (contentName?: string) => {
    trackEvent('Lead', {
      content_name: contentName
    });
  };

  const trackSearch = (searchString: string) => {
    trackEvent('Search', {
      search_string: searchString
    });
  };

  return {
    trackEvent,
    trackCustomEvent,
    trackPurchase,
    trackAddToCart,
    trackViewContent,
    trackLead,
    trackSearch
  };
};

export default FacebookPixel;

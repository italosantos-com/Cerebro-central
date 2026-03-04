import React, { useEffect, useState } from 'react';

interface InstagramEmbedProps {
  url: string;
  width?: number;
  height?: number;
  caption?: boolean;
  hideCaptionButton?: boolean;
}

declare global {
  interface Window {
    instgrm: any;
  }
}

const InstagramEmbed: React.FC<InstagramEmbedProps> = ({
  url,
  width = 400,
  height,
  caption = true,
  hideCaptionButton = false
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadInstagramEmbed = () => {
      // Verificar se o script já foi carregado
      if (typeof window !== 'undefined' && window.instgrm) {
        setIsLoaded(true);
        processEmbeds();
        return;
      }

      // Carregar script do Instagram
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.instagram.com/embed.js';
      script.onload = () => {
        setIsLoaded(true);
        processEmbeds();
      };
      script.onerror = () => {
        setError('Erro ao carregar script do Instagram');
      };

      document.head.appendChild(script);
    };

    const processEmbeds = () => {
      if (window.instgrm && window.instgrm.Embeds) {
        window.instgrm.Embeds.process();
      }
    };

    const createEmbed = () => {
      if (!containerRef.current) return;

      try {
        // Extrair ID do post da URL
        const postMatch = url.match(/\/p\/([^\/]+)/);
        const reelMatch = url.match(/\/reel\/([^\/]+)/);
        
        let embedUrl = '';
        if (postMatch) {
          embedUrl = `https://www.instagram.com/p/${postMatch[1]}/embed/`;
        } else if (reelMatch) {
          embedUrl = `https://www.instagram.com/reel/${reelMatch[1]}/embed/`;
        } else {
          throw new Error('URL do Instagram inválida');
        }

        // Criar blockquote para embed
        const blockquote = document.createElement('blockquote');
        blockquote.className = 'instagram-media';
        blockquote.setAttribute('data-instgrm-permalink', url);
        blockquote.setAttribute('data-instgrm-version', '14');
        
        if (!caption) {
          blockquote.setAttribute('data-instgrm-captioned', 'false');
        }

        blockquote.style.background = '#FFF';
        blockquote.style.border = '0';
        blockquote.style.borderRadius = '3px';
        blockquote.style.boxShadow = '0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15)';
        blockquote.style.margin = '1px';
        blockquote.style.maxWidth = `${width}px`;
        blockquote.style.minWidth = '326px';
        blockquote.style.padding = '0';
        blockquote.style.width = '99.375%';
        blockquote.style.width = '-webkit-calc(100% - 2px)';
        blockquote.style.width = 'calc(100% - 2px)';

        if (height) {
          blockquote.style.height = `${height}px`;
        }

        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(blockquote);

        loadInstagramEmbed();
      } catch (err) {
        console.error('Erro ao criar embed do Instagram:', err);
        setError('Erro ao carregar post do Instagram');
      }
    };

    createEmbed();
  }, [url, width, height, caption]);

  if (error) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 rounded">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="instagram-embed-container">
      <div ref={containerRef}>
        {!isLoaded && (
          <div 
            className="flex items-center justify-center bg-gray-100 rounded"
            style={{ width: `${width}px`, height: height || '400px' }}
          >
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto mb-2"></div>
              <p className="text-gray-600">Carregando Instagram...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Hook para API do Instagram (para posts programáticos)
export const useInstagramAPI = () => {
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    // Verificar se há token salvo
    const token = localStorage.getItem('instagram_access_token');
    if (token) {
      setAccessToken(token);
    }
  }, []);

  const authenticateUser = async () => {
    // Redirecionar para autenticação do Instagram
    const clientId = process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID;
    // Prefer Firebase auth handler when a public base is configured
    const publicBase = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL;
    const redirectUri = publicBase ? `${publicBase.replace(/\/$/, '')}/__/auth/handler` : `${window.location.origin}/auth/instagram/callback`;
    const scope = 'user_profile,user_media';
    
    if (clientId) {
      window.location.href = `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`;
    }
  };

  const getUserMedia = async (limit: number = 10) => {
    if (!accessToken) return null;

    try {
      const response = await fetch(
        `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink&limit=${limit}&access_token=${accessToken}`
      );
      
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Erro ao buscar mídia do Instagram:', error);
      return null;
    }
  };

  const getUserProfile = async () => {
    if (!accessToken) return null;

    try {
      const response = await fetch(
        `https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${accessToken}`
      );
      
      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar perfil do Instagram:', error);
      return null;
    }
  };

  return {
    accessToken,
    authenticateUser,
    getUserMedia,
    getUserProfile,
    isAuthenticated: !!accessToken
  };
};

export default InstagramEmbed;

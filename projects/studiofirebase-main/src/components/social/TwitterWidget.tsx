import React, { useEffect, useState } from 'react';

interface TwitterWidgetProps {
  type: 'timeline' | 'tweet' | 'follow-button' | 'hashtag-button' | 'mention-button';
  options?: {
    screenName?: string;
    userId?: string;
    tweetId?: string;
    hashtag?: string;
    size?: 'small' | 'medium' | 'large';
    count?: 'none' | 'horizontal' | 'vertical';
    lang?: string;
    theme?: 'light' | 'dark';
    width?: number;
    height?: number;
    chrome?: string[];
    showReplies?: boolean;
    tweetLimit?: number;
  };
}

declare global {
  interface Window {
    twttr: {
      widgets: {
        load: () => void;
        createTimeline: (
          source: { sourceType: string; screenName?: string; userId?: string },
          container: HTMLElement,
          options?: Record<string, any>
        ) => Promise<HTMLElement>;
        createTweet: (
          tweetId: string,
          container: HTMLElement,
          options?: Record<string, any>
        ) => Promise<HTMLElement>;
        createFollowButton: (
          screenName: string,
          container: HTMLElement,
          options?: Record<string, any>
        ) => Promise<HTMLElement>;
        createHashtagButton: (
          hashtag: string,
          container: HTMLElement,
          options?: Record<string, any>
        ) => Promise<HTMLElement>;
        createMentionButton: (
          screenName: string,
          container: HTMLElement,
          options?: Record<string, any>
        ) => Promise<HTMLElement>;
      };
    };
  }
}

const TwitterWidget: React.FC<TwitterWidgetProps> = ({ type, options = {} }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadTwitterWidget = () => {
      // Verificar se o script já foi carregado
      if (typeof window !== 'undefined' && window.twttr) {
        setIsLoaded(true);
        renderWidget();
        return;
      }

      // Carregar script do Twitter
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://platform.twitter.com/widgets.js';
      script.onload = () => {
        setIsLoaded(true);
        renderWidget();
      };

      document.head.appendChild(script);
    };

    const renderWidget = () => {
      if (!containerRef.current || !window.twttr || !window.twttr.widgets) return;

      // Limpar container
      containerRef.current.innerHTML = '';

      const {
        screenName = 'italosantos',
        userId,
        tweetId,
        hashtag,
        size = 'medium',
        count = 'horizontal',
        lang = 'pt',
        theme = 'light',
        width = 400,
        height = 400,
        chrome = [],
        showReplies = false,
        tweetLimit = 5
      } = options;

      try {
        switch (type) {
          case 'timeline':
            window.twttr.widgets.createTimeline(
              {
                sourceType: 'profile',
                screenName: screenName
              },
              containerRef.current,
              {
                width: width,
                height: height,
                chrome: chrome,
                theme: theme,
                lang: lang,
                tweetLimit: tweetLimit,
                showReplies: showReplies
              }
            );
            break;

          case 'tweet':
            if (tweetId) {
              window.twttr.widgets.createTweet(
                tweetId,
                containerRef.current,
                {
                  theme: theme,
                  lang: lang,
                  width: width
                }
              );
            }
            break;

          case 'follow-button':
            window.twttr.widgets.createFollowButton(
              screenName,
              containerRef.current,
              {
                size: size,
                showCount: count !== 'none',
                lang: lang
              }
            );
            break;

          case 'hashtag-button':
            if (hashtag) {
              window.twttr.widgets.createHashtagButton(
                hashtag,
                containerRef.current,
                {
                  size: size,
                  lang: lang
                }
              );
            }
            break;

          case 'mention-button':
            window.twttr.widgets.createMentionButton(
              screenName,
              containerRef.current,
              {
                size: size,
                lang: lang
              }
            );
            break;
        }
      } catch (error) {
        console.error('Erro ao renderizar widget do Twitter:', error);
      }
    };

    loadTwitterWidget();
  }, [type, options]);

  return (
    <div
      ref={containerRef}
      className="twitter-widget-container"
      style={{ minHeight: type === 'timeline' ? '400px' : '50px' }}
    >
      {!isLoaded && (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className="ml-2">Carregando Twitter...</span>
        </div>
      )}
    </div>
  );
};

// Componentes específicos para facilitar o uso
export const TwitterTimeline: React.FC<{
  screenName?: string;
  width?: number;
  height?: number;
  theme?: 'light' | 'dark';
  tweetLimit?: number;
}> = (props) => (
  <TwitterWidget type="timeline" options={props} />
);

export const TwitterTweet: React.FC<{
  tweetId: string;
  theme?: 'light' | 'dark';
  width?: number;
}> = (props) => (
  <TwitterWidget type="tweet" options={props} />
);

export const TwitterFollowButton: React.FC<{
  screenName?: string;
  size?: 'small' | 'medium' | 'large';
  showCount?: boolean;
}> = ({ showCount = true, ...props }) => (
  <TwitterWidget
    type="follow-button"
    options={{
      ...props,
      count: showCount ? 'horizontal' : 'none'
    }}
  />
);

export const TwitterHashtagButton: React.FC<{
  hashtag: string;
  size?: 'small' | 'medium' | 'large';
}> = (props) => (
  <TwitterWidget type="hashtag-button" options={props} />
);

export const TwitterMentionButton: React.FC<{
  screenName?: string;
  size?: 'small' | 'medium' | 'large';
}> = (props) => (
  <TwitterWidget type="mention-button" options={props} />
);

export default TwitterWidget;

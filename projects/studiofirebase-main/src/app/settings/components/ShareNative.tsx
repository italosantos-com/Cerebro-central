'use client';

import { useState } from 'react';

interface ShareNativeProps {
  title?: string;
  text?: string;
  url?: string;
}

export function ShareNative({
  title = 'Meu App',
  text = 'Confira este incrível app!',
  url = typeof window !== 'undefined' ? window.location.href : ''
}: ShareNativeProps) {
  const [isShared, setIsShared] = useState(false);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url
        });
        setIsShared(true);
        setTimeout(() => setIsShared(false), 2000);
      } catch (err) {
        console.log('Compartilhamento cancelado');
      }
    } else {
      // Fallback para copiar para clipboard
      const shareText = `${title}\n${text}\n${url}`;
      navigator.clipboard.writeText(shareText);
      setIsShared(true);
      setTimeout(() => setIsShared(false), 2000);
    }
  };

  return (
    <div className="ios-section">
      <button
        onClick={handleShare}
        className={`ios-item ios-item-action ${isShared ? 'ios-item-success' : ''}`}
        type="button"
      >
        <span>{isShared ? '✓ Compartilhado!' : '📤 Compartilhar'}</span>
      </button>
    </div>
  );
}

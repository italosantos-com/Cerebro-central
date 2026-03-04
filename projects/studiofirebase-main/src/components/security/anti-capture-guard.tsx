"use client";

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

type AntiCaptureGuardProps = {
  enabled?: boolean;
  scope?: string;
  userId?: string | null;
};

type CaptureEventType = 'printscreen' | 'print' | 'screen-record';

export default function AntiCaptureGuard({
  enabled = true,
  scope = 'exclusive',
  userId,
}: AntiCaptureGuardProps) {
  const pathname = usePathname();
  const [isBlocked, setIsBlocked] = useState(false);
  const blockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEventRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const clearBlock = () => {
      if (blockTimeoutRef.current) {
        clearTimeout(blockTimeoutRef.current);
      }
      blockTimeoutRef.current = setTimeout(() => {
        setIsBlocked(false);
      }, 3000);
    };

    const pauseMedia = () => {
      const media = Array.from(document.querySelectorAll('video, audio')) as HTMLMediaElement[];
      media.forEach((item) => {
        try {
          item.pause();
        } catch {
          // ignore
        }
      });
    };

    const reportEvent = async (eventType: CaptureEventType) => {
      const now = Date.now();
      if (now - lastEventRef.current < 1500) return;
      lastEventRef.current = now;

      try {
        await fetch('/api/security/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType,
            scope,
            path: pathname || '',
            userId: userId || null,
          })
        });
      } catch {
        // ignore
      }
    };

    const handleCaptureAttempt = (eventType: CaptureEventType) => {
      setIsBlocked(true);
      pauseMedia();
      clearBlock();
      void reportEvent(eventType);

      if (eventType === 'printscreen') {
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText('').catch(() => undefined);
        }
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'PrintScreen') {
        event.preventDefault();
        handleCaptureAttempt('printscreen');
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        handleCaptureAttempt('print');
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleCaptureAttempt('screen-record');
      }
    };

    const handleBlur = () => {
      handleCaptureAttempt('screen-record');
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      if (blockTimeoutRef.current) {
        clearTimeout(blockTimeoutRef.current);
      }
    };
  }, [enabled, pathname, scope, userId]);

  if (!enabled) return null;

  return (
    <div
      className={[
        'fixed inset-0 z-50 flex items-center justify-center bg-black/90 text-white',
        'transition-opacity duration-200',
        isBlocked ? 'opacity-100' : 'pointer-events-none opacity-0',
      ].join(' ')}
      aria-hidden={!isBlocked}
    >
      <div className="text-center px-6">
        <div className="text-lg font-semibold">Captura bloqueada</div>
        <p className="text-sm text-white/80 mt-2">
          Conteudo protegido. Capturas de tela e gravacoes nao sao permitidas.
        </p>
      </div>
    </div>
  );
}

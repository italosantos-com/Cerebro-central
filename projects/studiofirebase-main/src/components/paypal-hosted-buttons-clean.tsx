"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { setupArtifactObserver } from "@/utils/paypal-artifact-patterns";
import { Button } from "@/components/ui/button";

type Props = {
  hostedButtonId?: string;
  className?: string;
};

export default function PayPalHostedButtonsClean({ hostedButtonId = "QH7F9FWD9SR8G", className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const containerId = `paypal-container-${hostedButtonId}`;
  const maxRetries = 2;
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';
  const paypalCurrency = process.env.NEXT_PUBLIC_PAYPAL_CURRENCY || 'BRL';

  const loadHostedButtonsSDK = useCallback(async (): Promise<void> => {
    if (typeof window === 'undefined') return;
    if ((window as any).paypal?.HostedButtons) return;
    if (!clientId) throw new Error('NEXT_PUBLIC_PAYPAL_CLIENT_ID não configurado.');

    const scriptId = 'paypal-hosted-buttons-sdk';

    // Check for the hosted-buttons script specifically, then any other PayPal script
    const existingById = document.getElementById(scriptId) as HTMLScriptElement | null;
    const existingAny = !existingById
      ? (document.querySelector('script[src*="paypal.com/sdk/js"]') as HTMLScriptElement | null)
      : null;

    if (!existingById && !existingAny) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&components=buttons,hosted-buttons&intent=capture&commit=true&disable-funding=venmo&currency=${encodeURIComponent(paypalCurrency)}`;
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Falha ao carregar SDK do PayPal.'));
        document.head.appendChild(script);
      });
      return;
    }

    // A script is already in the DOM — wait for window.paypal.HostedButtons to appear
    await new Promise<void>((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50;
      const interval = setInterval(() => {
        if ((window as any).paypal?.HostedButtons) {
          clearInterval(interval);
          resolve();
          return;
        }
        attempts += 1;
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          reject(new Error('SDK do PayPal não inicializou a API HostedButtons.'));
        }
      }, 120);
    });
  }, [clientId, paypalCurrency]);

  // Artifact cleanup effect
  useEffect(() => {
    const target = containerRef.current;
    if (!target) return;
    return setupArtifactObserver(target);
  }, []);

  // PayPal rendering effect with retry logic
  useEffect(() => {
    let cancelled = false;
    const MAX_ATTEMPTS = 50; // Aumentado para 50 tentativas (12.5 segundos)
    const RETRY_INTERVAL = 250;

    const waitForHostedButtons = (): Promise<void> =>
      new Promise<void>((resolve, reject) => {
        let attempts = 0;
        const checkInterval = setInterval(() => {
          if (cancelled) {
            clearInterval(checkInterval);
            reject(new Error('Componente desmontado antes da inicialização'));
            return;
          }
          const paypal = (window as any).paypal;
          if (paypal?.HostedButtons) {
            clearInterval(checkInterval);
            resolve();
            return;
          }
          attempts += 1;
          if (attempts >= MAX_ATTEMPTS) {
            clearInterval(checkInterval);
            reject(new Error('API HostedButtons não disponível - PayPal SDK não carregou'));
            return;
          }
        }, RETRY_INTERVAL);
      });

    const renderButton = async (): Promise<void> => {
      try {
        await loadHostedButtonsSDK();
        await waitForHostedButtons();
        if (cancelled) return;

        const paypal = (window as any).paypal;
        if (!paypal?.HostedButtons) {
          throw new Error('HostedButtons API indisponível');
        }

        const target = containerRef.current;
        if (!target) {
          throw new Error('Container não encontrado');
        }

        // Clear any previous render before injecting new buttons
        if (target.hasChildNodes()) {
          target.innerHTML = '';
        }
        await paypal.HostedButtons({ hostedButtonId }).render(`#${containerId}`);
        setError(null); // Clear error on success
      } catch (e: any) {
        if (!cancelled) {
          console.error('[PayPal Hosted Buttons]', e);
          setError(e?.message || 'Erro ao renderizar botão PayPal');
        }
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => void renderButton(), { once: true });
      return () => {
        cancelled = true;
      };
    }

    void renderButton();

    return () => {
      cancelled = true;
    };
  }, [hostedButtonId, containerId, retryCount, loadHostedButtonsSDK]);

  const handleRetry = useCallback(() => {
    if (retryCount >= maxRetries) {
      setError('Máximo de tentativas atingido. Atualize a página.');
      return;
    }
    setError(null);
    setRetryCount((prev) => prev + 1);
  }, [retryCount]);

  return (
    <div className={className} role="region" aria-label="PayPal payment button">
      {error ? (
        <div className="flex flex-col items-center gap-3 p-4 rounded border border-red-300 bg-red-50 text-red-700">
          <span className="text-sm">⚠️ {error}</span>
          {retryCount < maxRetries && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="text-xs"
            >
              Tentar Novamente ({retryCount}/{maxRetries})
            </Button>
          )}
        </div>
      ) : null}
      <div
        id={containerId}
        ref={containerRef}
        role="application"
        aria-label="PayPal Hosted Button"
        aria-busy={!error}
      />
      <style jsx>{`
        #${containerId} :global(form) {
          display: flex !important;
          flex-direction: column !important;
          gap: 0.5rem !important;
          width: 100% !important;
        }
        #${containerId} :global(input[type="submit"]):first-of-type {
          width: 100% !important;
          min-height: 50px !important;
          height: 50px !important;
          font-size: 1rem !important;
          font-weight: bold !important;
          border-radius: 0.375rem !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
        }
        #${containerId} :global(input[type="submit"]):first-of-type:hover {
          transform: scale(1.02) !important;
          opacity: 0.95 !important;
        }
        /* Ocultar apenas o segundo botão PAGAR (cartões de crédito) */
        #${containerId} :global(input[type="submit"]):nth-of-type(2),
        #${containerId} :global(input[type="submit"]):last-of-type:not(:first-of-type),
        #${containerId} :global(button):nth-of-type(2) {
          display: none !important;
        }
        /* Manter os ícones de cartões visíveis */
        #${containerId} :global(img) {
          max-width: 100% !important;
          height: auto !important;
          margin-top: 0.5rem !important;
        }
        /* Manter seção "Com tecnologia PayPal" visível mas estilizada */
        #${containerId} :global(section) {
          text-align: center !important;
          margin-top: 0.5rem !important;
          font-size: 0.75rem !important;
          color: #666 !important;
        }
      `}</style>
    </div>
  );
}

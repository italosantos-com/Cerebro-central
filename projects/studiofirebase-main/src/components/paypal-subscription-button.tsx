"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  planId?: string;
  className?: string;
  onSuccess?: (subscriptionId: string) => void;
};

export default function PayPalSubscriptionButton({ 
  planId = "P-59R828317B3132246NEKXNTA", 
  className,
  onSuccess 
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerId = `paypal-subscription-container-${planId}`;

  useEffect(() => {
    let cancelled = false;

    const loadPayPalSDK = () => {
      return new Promise<void>((resolve, reject) => {
        // Verifica se o SDK já está carregado
        if ((window as any).paypal) {
          resolve();
          return;
        }

        // Verifica se já existe qualquer script PayPal sendo carregado (qualquer id)
        const existingScript = document.querySelector('script[src*="paypal.com/sdk/js"]');
        if (existingScript) {
          // Aguardar a inicialização do SDK já injetado (até 10 segundos)
          const POLL_INTERVAL_MS = 100;
          const SDK_TIMEOUT_MS = 10000;
          let attempts = 0;
          const maxAttempts = SDK_TIMEOUT_MS / POLL_INTERVAL_MS;
          const interval = setInterval(() => {
            if ((window as any).paypal) {
              clearInterval(interval);
              resolve();
              return;
            }
            attempts += 1;
            if (attempts >= maxAttempts) {
              clearInterval(interval);
              if ((window as any).paypal) resolve();
              else reject(new Error('Timeout aguardando SDK do PayPal'));
            }
          }, POLL_INTERVAL_MS);
          return;
        }

        // Carrega o SDK
        const script = document.createElement('script');
        script.src = `https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}&vault=true&intent=subscription`;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Falha ao carregar SDK do PayPal'));
        document.head.appendChild(script);
      });
    };

    const renderButton = async () => {
      try {
        await loadPayPalSDK();
        if (cancelled) return;

        const paypal = (window as any).paypal;
        if (!paypal?.Buttons) {
          throw new Error('PayPal Buttons API indisponível.');
        }

        const target = containerRef.current;
        if (!target) {
          throw new Error('Container PayPal não encontrado.');
        }

        target.innerHTML = '';

        paypal.Buttons({
          style: {
            shape: 'rect',
            color: 'silver',
            layout: 'vertical',
            label: 'subscribe'
          },
          createSubscription: function(data: any, actions: any) {
            return actions.subscription.create({
              plan_id: planId
            });
          },
          onApprove: function(data: any, actions: any) {
            if (onSuccess) {
              onSuccess(data.subscriptionID);
            } else {
              alert(`Assinatura criada com sucesso! ID: ${data.subscriptionID}`);
            }
          },
          onError: function(err: any) {
            console.error('Erro no PayPal:', err);
            setError('Erro ao processar assinatura');
          }
        }).render(`#${containerId}`);

      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Erro ao inicializar botão de assinatura');
        }
      }
    };

    void renderButton();

    return () => {
      cancelled = true;
    };
  }, [planId, containerId, onSuccess]);

  return (
    <div className={className}>
      {error ? <div className="text-red-500 text-sm">Erro PayPal: {error}</div> : null}
      <div id={containerId} ref={containerRef} />
    </div>
  );
}

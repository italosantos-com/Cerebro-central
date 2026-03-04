"use client";

import { useEffect, useRef, useState } from 'react';
import { paypalV5 } from '@/services/paypal-sdk-v5';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface PayPalButtonsV5Props {
  amount: number | string;
  currency?: string; // Moeda dinâmica (ex: USD, EUR, BRL) vinda da localização
  description?: string;
  onSuccess?: (details: any) => void;
  onError?: (error: any) => void;
  clientId?: string; // override se necessário
  className?: string;
  captureContext?: { productId?: string; userId?: string }; // opcional, atualmente não usado
  forceRefreshKey?: string; // altera para recarregar SDK quando moeda muda
  onClick?: (data: any, actions: any) => any;
  style?: Record<string, any>;
}

export default function PayPalButtonsV5({
  amount,
  currency = 'BRL',
  description = 'Compra',
  clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
  onSuccess,
  onError,
  className = '',
  forceRefreshKey,
  onClick,
  style,
}: PayPalButtonsV5Props) {
  const [status, setStatus] = useState<'loading'|'ready'|'error'|'success'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [details, setDetails] = useState<any>(null);
  const [containerId] = useState(() => `paypal-buttons-v5-root-${Math.random().toString(36).slice(2, 9)}`);
  const handlersRef = useRef({ onSuccess, onError, onClick });

  useEffect(() => {
    handlersRef.current = { onSuccess, onError, onClick };
  }, [onSuccess, onError, onClick]);

  useEffect(() => {
    let cancelled = false;
    let buttonsHandle: { close: () => void } | null = null;
    const init = async () => {
      try {
        if (!clientId) {
          throw new Error('CLIENT_ID do PayPal não definido.');
        }
        const amt = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (!Number.isFinite(amt)) throw new Error('Valor inválido para amount.');
        // Re-render sempre que currency ou forceRefreshKey mudar para garantir SDK correto
        buttonsHandle = await paypalV5.renderPayPalButtons(clientId, {
          amount: amt,
          currency,
          description,
          selector: `#${containerId}`,
          debug: process.env.NEXT_PUBLIC_PAYPAL_DEBUG === '1',
          audit: process.env.NEXT_PUBLIC_PAYPAL_AUDIT === '1',
          style,
          onSuccess: (d) => {
            if (cancelled) return;
            setDetails(d);
            setStatus('success');
            handlersRef.current.onSuccess && handlersRef.current.onSuccess(d);
          },
          onError: (err) => {
            if (cancelled) return;
            setErrorMsg(err?.message || 'Erro desconhecido');
            setStatus('error');
            handlersRef.current.onError && handlersRef.current.onError(err);
          },
          onClick: (data, actions) => handlersRef.current.onClick ? handlersRef.current.onClick(data, actions) : undefined
        });
        if (!cancelled) setStatus('ready');

        // Remover artefatos de texto indesejados que o SDK pode injetar ("PAY NOW", "card icons", isolado "|")
        const cleanupArtifacts = () => {
          const root = document.getElementById(containerId);
          if (!root) return;
          const scope = root.parentElement || root;
          const elements = Array.from(scope.querySelectorAll('div, span, p')) as HTMLElement[];
          elements.forEach(el => {
            if (!el) return;
            const txt = (el.textContent || '').trim();
            if (!txt) return;
            const lower = txt.toLowerCase();
            const isArtifact = lower === 'pay now' || lower.includes('card icons') || txt === '|' || lower.startsWith('pay now card icons');
            // Evitar remover o container principal do botão (que possui iframe ou botão real)
            const hasInteractive = el.querySelector('iframe, button');
            if (isArtifact && !hasInteractive) {
              el.style.display = 'none';
            }
          });
        };
        // Executa em múltiplos intervalos para capturar inserções tardias
        cleanupArtifacts();
        setTimeout(cleanupArtifacts, 200);
        setTimeout(cleanupArtifacts, 600);
      } catch (e: any) {
        if (cancelled) return;
        setErrorMsg(e.message || 'Falha ao inicializar PayPal');
        setStatus('error');
        handlersRef.current.onError && handlersRef.current.onError(e);
      }
    };
    init();
    return () => {
      cancelled = true;
      // Close the PayPal buttons instance to prevent "container removed from DOM" errors
      if (buttonsHandle) {
        buttonsHandle.close();
        buttonsHandle = null;
      }
    };
  }, [amount, currency, description, clientId, forceRefreshKey, containerId]); // style é complexo e não afeta init

  return (
    <div className={className}>
      {status === 'loading' && (
        <div className="flex items-center gap-2 p-4 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm text-muted-foreground">Carregando PayPal...</span>
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-2 p-4 border border-destructive rounded bg-destructive/10">
          <XCircle className="h-5 w-5 text-destructive" />
          <div className="text-sm">
            <p className="font-semibold">Erro PayPal</p>
            <p className="text-muted-foreground">{errorMsg}</p>
          </div>
        </div>
      )}
      {status === 'success' && (
        <div className="flex items-center gap-2 p-4 border border-green-500 rounded bg-green-500/10">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <div className="text-sm">
            <p className="font-semibold">Pagamento concluído!</p>
            <p className="text-muted-foreground truncate">ID: {details?.id}</p>
          </div>
        </div>
      )}
      <div id={containerId} className={status==='success' ? 'mt-4 opacity-40 pointer-events-none' : ''} />
    </div>
  );
}
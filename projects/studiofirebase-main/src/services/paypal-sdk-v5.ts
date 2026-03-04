// Lightweight PayPal v5 (classic JS SDK) helper
// Loads the PayPal JS SDK and renders Buttons using client-side createOrder/onApprove

declare global {
  interface Window {
    paypal?: any;
  }
}

interface PayPalButtonsOptions {
  amount: number;
  currency?: string;
  description?: string;
  onSuccess: (details: any) => void;
  onError: (err: any) => void;
  selector?: string; // CSS selector ou id (#id)
  style?: any;
  debug?: boolean; // habilita logs de auditoria
  audit?: boolean; // envia eventos para rota /api/paypal/audit
  onClick?: (data: any, actions: any) => any;
}

const SDK_ID = 'paypal-sdk-v5-script';

// Prevent concurrent SDK loads across multiple component instances
let _sdkLoadPromise: Promise<void> | null = null;

export async function loadPayPalSDK(clientId: string, currency: string = 'BRL') {
  if (typeof window === 'undefined') return;
  if (window.paypal) return;

  // If a load is already in progress, wait for it instead of injecting a second script
  if (_sdkLoadPromise) {
    await _sdkLoadPromise;
    return;
  }

  // Check for ANY existing PayPal SDK script (v5, hosted-buttons, @paypal/react-paypal-js, etc.)
  const anyExistingScript = document.querySelector('script[src*="paypal.com/sdk/js"]');
  if (anyExistingScript) {
    // Wait up to 10 s for an already-injected script to initialise window.paypal
    _sdkLoadPromise = new Promise<void>((resolve, reject) => {
      if (window.paypal) { resolve(); return; }
      const id = setInterval(() => {
        if (window.paypal) { clearInterval(id); clearTimeout(tid); resolve(); }
      }, 100);
      const tid = setTimeout(() => {
        clearInterval(id);
        if (window.paypal) resolve();
        else reject(new Error('Timeout aguardando SDK do PayPal já injetado'));
      }, 10000);
    });
    try { await _sdkLoadPromise; } finally { _sdkLoadPromise = null; }
    return;
  }

  let blocked = false;
  const buildSrc = (retry: boolean) => {
    const baseParams = `client-id=${clientId}&currency=${currency}&intent=capture&commit=true&components=buttons&disable-funding=paylater,venmo`;
    const retryParams = retry ? '&enable-funding=paypal' : '';
    return `https://www.paypal.com/sdk/js?${baseParams}${retryParams}`;
  };

  const attemptLoad = (retry: boolean) => new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.id = retry ? `${SDK_ID}-retry` : SDK_ID;
    script.src = buildSrc(retry);
    script.async = true;
    script.setAttribute('data-paypal-sdk', retry ? 'retry' : 'primary');
    script.onload = () => {
      setTimeout(() => {
        if (window.paypal) {
          resolve();
        } else {
          reject(new Error('PayPal SDK carregado mas não inicializado'));
        }
      }, 120);
    };
    script.onerror = () => {
      blocked = true;
      reject(new Error('Falha ao carregar PayPal SDK v5 - verifique bloqueadores de conteúdo, conexão e CSP'));
    };
    document.head.appendChild(script);
  });

  _sdkLoadPromise = (async () => {
    try {
      await attemptLoad(false);
    } catch (e) {
      // Retry once if blocked or not initialized
      try {
        await attemptLoad(true);
      } catch (finalErr) {
        if (blocked) {
          console.warn('[paypal] Possível bloqueio por extensão de conteúdo. Oriente o usuário a liberar *.paypal.com e *.paypalobjects.com');
        }
        throw finalErr;
      }
    }
  })();

  try {
    await _sdkLoadPromise;
  } finally {
    _sdkLoadPromise = null;
  }
}

export async function renderPayPalButtons(clientId: string, options: PayPalButtonsOptions): Promise<{ close: () => void }> {
  const { amount, currency = 'BRL', description = 'Compra', onSuccess, onError, selector = '#paypal-buttons', style, debug, audit, onClick } = options;
  
  try {
    await loadPayPalSDK(clientId, currency);
  } catch (error: any) {
    onError(error);
    throw error;
  }

  if (!window.paypal) {
    const error = new Error('PayPal SDK não disponível. Verifique bloqueadores de conteúdo e CSP.');
    onError(error);
    throw error;
  }

  const targetEl = selector.startsWith('#') ? document.querySelector(selector) : document.querySelector(selector);
  if (!targetEl) {
    const error = new Error(`Elemento alvo "${selector}" não encontrado para PayPal Buttons.`);
    onError(error);
    throw error;
  }

  // Limpar render anterior se existir
  targetEl.innerHTML = '';

  if (debug) {
    console.info('[paypal][init] renderPayPalButtons', { clientId: clientId.slice(0, 8) + '...', amount, currency, description, selector });
  }

  const sendAudit = async (stage: string, extra?: Record<string, any>) => {
    if (!audit) return;
    try {
      await fetch('/api/paypal/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage,
          currency,
          amount,
          description,
          ...extra,
        })
      });
    } catch (e) {
      if (debug) console.warn('[paypal][audit] falha envio', e);
    }
  };

  await sendAudit('init');

  const buttonsInstance = window.paypal.Buttons({
    style: style || { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' },
    createOrder: (_data: any, actions: any) => {
      if (debug) {
        console.info('[paypal][createOrder] payload', {
          purchase_units: [
            {
              description,
              amount: {
                currency_code: currency,
                value: amount.toFixed(2)
              }
            }
          ]
        });
      }
      void sendAudit('createOrder');
      return actions.order.create({
        purchase_units: [
          {
            description,
            amount: {
              currency_code: currency,
              value: amount.toFixed(2)
            }
          }
        ]
      });
    },
    onApprove: async (_data: any, actions: any) => {
      try {
        const details = await actions.order.capture();
        if (debug) {
          console.info('[paypal][capture] detalhes', { id: details?.id, status: details?.status, payer: details?.payer?.email_address });
        }
        void sendAudit('capture', { orderId: details?.id, payerEmail: details?.payer?.email_address });
        onSuccess(details);
      } catch (e) {
        onError(e);
      }
    },
    onError: (err: any) => {
      if (debug) {
        console.error('[paypal][error]', err);
      }
      void sendAudit('error', { meta: { message: err?.message } });
      onError(err);
    },
    onClick: onClick ? (data: any, actions: any) => onClick(data, actions) : undefined
  });

  await buttonsInstance.render(targetEl);
  return {
    close: () => {
      try { buttonsInstance.close(); } catch (_e) { /* ignore */ }
    }
  };
}

export const paypalV5 = { loadPayPalSDK, renderPayPalButtons };
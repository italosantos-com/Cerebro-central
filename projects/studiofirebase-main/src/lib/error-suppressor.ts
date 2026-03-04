/**
 * Error Suppressor Script
 * Suprime erros esperados que não afetam a funcionalidade
 */

if (typeof window !== 'undefined') {
  // Capturar erros de CORS esperados
  const originalError = console.error;
  console.error = function (...args: any[]) {
    const message = args[0]?.toString ? args[0].toString() : '';

    // Silenciar erros de CORS do Firestore
    if (message.includes('firestore.googleapis.com') && message.includes('access control')) {
      return; // Não exibir no console
    }

    // Silenciar erros de CORS do PayPal
    if (message.includes('paypal.com') && message.includes('access control')) {
      return; // Não exibir no console
    }

    // Silenciar CSP warnings sobre require-trusted-types-for
    if (message.includes('require-trusted-types-for')) {
      return; // Não exibir no console
    }

    // Silenciar erro esperado do PayPal quando container não está disponível
    if (message.includes('ncps_button_container_missing')) {
      return;
    }

    // Chamar original para outros erros
    originalError.apply(console, args);
  };

  // Capturar eventos de erro globais
  window.addEventListener('error', (event) => {
    const message = event.message?.toString?.() || '';

    // Silenciar CORS errors esperados
    if (message.includes('access control') || message.includes('CORS')) {
      if (message.includes('firestore.googleapis.com') || message.includes('paypal.com')) {
        event.preventDefault();
        return false;
      }
    }

    if (message.includes('ncps_button_container_missing')) {
      event.preventDefault();
      return false;
    }

    return true;
  }, true);

  // Capturar rejection de promessas não tratadas
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message?.toString?.() || event.reason?.toString?.() || '';

    // Silenciar CORS errors esperados
    if (reason.includes('access control') || reason.includes('CORS')) {
      if (reason.includes('firestore.googleapis.com') || reason.includes('paypal.com')) {
        event.preventDefault();
        return;
      }
    }

    if (reason.includes('ncps_button_container_missing')) {
      event.preventDefault();
      return;
    }

    // Silenciar erros de rede esperados no WebKit/Safari
    if (reason === 'Load failed' || reason === 'Failed to fetch') {
      event.preventDefault();
      return;
    }

    // Silenciar erros internos de transporte do Firestore (reconexão automática)
    if (reason.includes('WebChannelConnection') || reason.includes('transport errored')) {
      event.preventDefault();
      return;
    }
  });
}

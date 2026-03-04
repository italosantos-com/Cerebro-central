const SERVICE_WORKER_PATH = '/sw.js';

function canRegisterServiceWorker(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator;
}

export function registerServiceWorker(): void {
  if (!canRegisterServiceWorker()) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(SERVICE_WORKER_PATH)
      .then((registration) => {
        console.info('[PWA] Service Worker registrado com sucesso:', registration.scope);
      })
      .catch((error) => {
        console.error('[PWA] Falha ao registrar Service Worker:', error);
      });
  });
}

// Registro automático para manter compatibilidade com o snippet JS antigo.
registerServiceWorker();

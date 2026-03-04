/**
 * Previne redirecionamentos prematuros durante carregamento de contextos
 */

let redirectBlocked = false;
let originalPush: any = null;
let originalReplace: any = null;

export function blockRedirects() {
  if (typeof window !== 'undefined' && !redirectBlocked) {

    
    // Interceptar History API
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    
    window.history.pushState = function(state, title, url) {
      if (url && typeof url === 'string' && (url.includes('/perfil') || url.includes('/auth/face'))) {

        return;
      }
      return originalPushState.apply(this, arguments as any);
    };
    
    window.history.replaceState = function(state, title, url) {
      if (url && typeof url === 'string' && (url.includes('/perfil') || url.includes('/auth/face'))) {

        return;
      }
      return originalReplaceState.apply(this, arguments as any);
    };
    
    redirectBlocked = true;
  }
}

export function unblockRedirects() {
  if (typeof window !== 'undefined' && redirectBlocked) {

    
    // Restaurar History API original (se interceptamos)
    if (originalPush) {
      (window.history as any).pushState = originalPush;
    }
    if (originalReplace) {
      (window.history as any).replaceState = originalReplace;
    }
    
    redirectBlocked = false;
  }
}

export function isRedirectBlocked(): boolean {
  return redirectBlocked;
}

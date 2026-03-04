/**
 * BLOQUEADOR DE EMERGÊNCIA - Executa IMEDIATAMENTE
 * Coloque este script no <head> da página para interceptar redirecionamentos
 */

(function() {
  if (typeof window === 'undefined') return;
  

  
  // Interceptar History API IMEDIATAMENTE
  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;
  
  window.history.pushState = function(state, title, url) {

    
    if (url && (url.includes('/perfil') || url.includes('/auth/face'))) {

      alert('🚫 REDIRECIONAMENTO BLOQUEADO!\n\nTentativa de ir para: ' + url + '\n\nVerifique o console para mais detalhes.');
      return;
    }
    
    return originalPushState.apply(this, arguments);
  };
  
  window.history.replaceState = function(state, title, url) {

    
    if (url && (url.includes('/perfil') || url.includes('/auth/face'))) {

      alert('🚫 REDIRECIONAMENTO BLOQUEADO!\n\nTentativa de ir para: ' + url + '\n\nVerifique o console para mais detalhes.');
      return;
    }
    
    return originalReplaceState.apply(this, arguments);
  };
  
  // Interceptar location.href
  let originalHref = window.location.href;
  Object.defineProperty(window.location, 'href', {
    get: function() { return originalHref; },
    set: function(url) {

      
      if (url.includes('/perfil') || url.includes('/auth/face')) {

        alert('🚫 REDIRECIONAMENTO BLOQUEADO!\n\nTentativa de ir para: ' + url + '\n\nVerifique o console para mais detalhes.');
        return;
      }
      
      originalHref = url;
      // Permitir redirecionamento se não for bloqueado
      setTimeout(() => {
        window.location.assign(url);
      }, 0);
    }
  });
  
  // Interceptar window.location.assign
  const originalAssign = window.location.assign;
  window.location.assign = function(url) {

    
    if (url.toString().includes('/perfil') || url.toString().includes('/auth/face')) {

      alert('🚫 REDIRECIONAMENTO BLOQUEADO!\n\nTentativa de ir para: ' + url + '\n\nVerifique o console para mais detalhes.');
      return;
    }
    
    return originalAssign.call(this, url);
  };
  
  // Interceptar window.location.replace
  const originalReplace = window.location.replace;
  window.location.replace = function(url) {

    
    if (url.toString().includes('/perfil') || url.toString().includes('/auth/face')) {

      alert('🚫 REDIRECIONAMENTO BLOQUEADO!\n\nTentativa de ir para: ' + url + '\n\nVerifique o console para mais detalhes.');
      return;
    }
    
    return originalReplace.call(this, url);
  };
  

  
  // Tornar disponível globalmente para controle
  window.emergencyBlocker = {
    active: true,
    disable: function() {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.location.assign = originalAssign;
      window.location.replace = originalReplace;

    }
  };
  
})();

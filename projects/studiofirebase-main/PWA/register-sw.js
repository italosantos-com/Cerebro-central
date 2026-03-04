// Registrar o Service Worker — adicione esse pequeno script ao seu bundle JS ou como <script> no final do body
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registrado com sucesso:', registration);
      })
      .catch(error => {
        console.error('Falha ao registrar Service Worker:', error);
      });
  });
}
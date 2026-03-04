"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof globalThis.window === 'undefined') return;
    if (!("serviceWorker" in navigator)) return;

    const isDev = process.env.NODE_ENV !== "production";

    // Em DEV, o SW pode manter bundles antigos em cache e causar erros fantasmas.
    // Aqui a gente desativa e limpa automaticamente para garantir que o browser
    // esteja sempre rodando o código mais novo.
    if (isDev) {
      (async () => {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          console.info('[PWA] DEV: service workers encontrados:', regs.length);
          await Promise.all(regs.map((r) => r.unregister()));
          console.info('[PWA] DEV: service workers desregistrados');

          if (typeof globalThis.caches !== 'undefined') {
            const keys = await globalThis.caches.keys();
            await Promise.all(keys.map((k) => globalThis.caches.delete(k)));
            console.info('[PWA] DEV: caches limpos', { count: keys.length });
          }
        } catch (err) {
          console.warn('[PWA] DEV: falha ao desregistrar/limpar cache', err);
        }
      })();
      return;
    }

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => {
          console.info('[PWA] SW registrado (/sw.js)');
        })
        .catch((err) => {
          console.warn('[PWA] Falha ao registrar SW', err);
        });
    };

    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });

    return () => {
      window.removeEventListener("load", onLoad);
    };
  }, []);

  return null;
}

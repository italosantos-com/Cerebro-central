"use client";
import React, { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function InstagramCallbackPage() {
  const router = useRouter();
  const search = useSearchParams();

  useEffect(() => {
    // Processa o código de autorização recebido
    const code = search?.get("code");
    if (code) {
      // Troca o código por token de acesso via backend
      fetch("/api/instagram/callback?code=" + code)
        .then(async (res) => {
          if (!res.ok) {
            const error = await res.text();
            console.error("Erro ao trocar código Instagram:", error);
            return;
          }
          // Após sucesso, tenta refresh de token
          try {
            const refreshRes = await fetch("/api/instagram/refresh-token", { method: "POST" });
            if (!refreshRes.ok) {
              const refreshError = await refreshRes.text();
              console.error("Erro ao atualizar token Instagram:", refreshError);
              // Pode mostrar mensagem ou seguir sem refresh
            }
          } catch (err) {
            console.error("Falha na requisição de refresh Instagram:", err);
          }
          // Redireciona para perfil
          router.replace("/perfil");
        })
        .catch((err) => {
          console.error("Falha na requisição Instagram OAuth:", err);
        });
    }
  }, [search, router]);

  return (
    <div className="max-w-md mx-auto p-8">
      <h1 className="text-xl font-bold mb-4">Processando Instagram OAuth…</h1>
      <p>Aguarde, estamos conectando sua conta Instagram.</p>
    </div>
  );
}

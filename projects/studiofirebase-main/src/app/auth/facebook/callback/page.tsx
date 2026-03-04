"use client";
import React, { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function FacebookCallbackPage() {
  const router = useRouter();
  const search = useSearchParams();

  useEffect(() => {
    // Processa o código de autorização recebido
    const code = search?.get("code");
    if (code) {
      // Troca o código por token de acesso via backend
      fetch("/api/facebook/callback?code=" + code)
        .then(async (res) => {
          if (!res.ok) {
            const error = await res.text();
            console.error("Erro ao trocar código Facebook:", error);
            return;
          }
          // Após sucesso, tenta refresh de token
          try {
            const refreshRes = await fetch("/api/facebook/refresh-token", { method: "POST" });
            if (!refreshRes.ok) {
              const refreshError = await refreshRes.text();
              console.error("Erro ao atualizar token Facebook:", refreshError);
              // Pode mostrar mensagem ou seguir sem refresh
            }
          } catch (err) {
            console.error("Falha na requisição de refresh Facebook:", err);
          }
          // Redireciona para perfil
          router.replace("/perfil");
        })
        .catch((err) => {
          console.error("Falha na requisição Facebook OAuth:", err);
        });
    }
  }, [search, router]);

  return (
    <div className="max-w-md mx-auto p-8">
      <h1 className="text-xl font-bold mb-4">Processando Facebook OAuth…</h1>
      <p>Aguarde, estamos conectando sua conta Facebook.</p>
    </div>
  );
}

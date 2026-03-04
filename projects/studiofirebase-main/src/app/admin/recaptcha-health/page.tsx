"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type HealthResponse = {
  ok: boolean;
  status?: number;
  error?: string;
  hint?: string;
  keySource?: string | null;
  scriptUrl?: string;
  cached?: boolean;
  ageMs?: number;
  ms?: number;
};

export default function RecaptchaHealthPage() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/health/recaptcha", { cache: "no-store" });
      const json = (await res.json()) as HealthResponse;
      setData(json);
      if (!json.ok && json.error) setError(json.error);
    } catch (e: any) {
      setError(e?.message || "Erro ao consultar saúde do reCAPTCHA Enterprise");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">reCAPTCHA Enterprise - Health</h1>
      <p className="text-sm text-muted-foreground">
        Verifica a chave pública configurada, acessibilidade do script e informações de cache.
      </p>

      <div className="flex gap-2">
        <Button onClick={load} disabled={loading}>
          {loading ? "Verificando..." : "Recarregar"}
        </Button>
      </div>

      {data && (
        <div className="rounded border p-4 text-sm space-y-2">
          <div>
            <span className="font-medium">Status:</span>{" "}
            {data.ok ? (
              <span className="text-green-600">OK</span>
            ) : (
              <span className="text-red-600">FALHA</span>
            )}
          </div>
          {typeof data.status !== "undefined" && (
            <div>
              <span className="font-medium">HTTP:</span> {data.status}
            </div>
          )}
          {data.keySource && (
            <div>
              <span className="font-medium">Chave usada:</span> {data.keySource}
            </div>
          )}
          {data.scriptUrl && (
            <div className="break-all">
              <span className="font-medium">Script:</span> {data.scriptUrl}
            </div>
          )}
          {typeof data.cached !== "undefined" && (
            <div>
              <span className="font-medium">Cache:</span> {String(data.cached)} {typeof data.ageMs === "number" ? `(age ${data.ageMs}ms)` : ""}
            </div>
          )}
          {typeof data.ms === "number" && (
            <div>
              <span className="font-medium">Tempo:</span> {data.ms}ms
            </div>
          )}
          {data.hint && (
            <div className="text-amber-600">Dica: {data.hint}</div>
          )}
          {error && (
            <div className="text-red-600">Erro: {error}</div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";

export default function AuthCallbackPage() {
  const search = useSearchParams();

  const payload = useMemo(() => {
    const entries: Record<string, string | null> = {};
    if (!search) return entries;
    search.forEach((v, k) => {
      entries[k] = v;
    });
    // Normalize keys we expect
    const platform = (entries["platform"] || "").toString();
    const success = (entries["success"] || entries["connected"] || "").toString();
    const error = (entries["error"] || "").toString();
    const username = (entries["username"] || entries["screen_name"] || "").toString();
    return { platform, success, error, username, ...entries };
  }, [search]);

  useEffect(() => {
    try {
      if (window.opener) {
        window.opener.postMessage(payload, window.location.origin);
      }
    } catch { }
    const t = setTimeout(() => {
      try { window.close(); } catch { }
    }, 500);
    return () => clearTimeout(t);
  }, [payload]);

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif' }}>
      <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Processando autenticação…</h1>
      <p>Você já pode fechar esta janela.</p>
    </div>
  );
}

"use client";
import React from "react";
import { useRouter } from "next/navigation";

export default function WhatsAppAuthPage() {
  const router = useRouter();

  const handleLogin = () => {
    // Redireciona para o endpoint OAuth do WhatsApp Business (exemplo fictício)
    window.location.href = "https://business.facebook.com/connect/oauth?client_id=SEU_WHATSAPP_APP_ID&redirect_uri=https://italosantos.com/auth/whatsapp/callback&scope=whatsapp_business_messaging&response_type=code";
  };

  return (
    <div className="max-w-md mx-auto p-8">
      <h1 className="text-xl font-bold mb-4">Conectar WhatsApp</h1>
      <p className="mb-4">Clique abaixo para autenticar com o WhatsApp Business.</p>
      <button className="bg-green-500 text-white px-4 py-2 rounded" onClick={handleLogin}>
        Login com WhatsApp
      </button>
    </div>
  );
}

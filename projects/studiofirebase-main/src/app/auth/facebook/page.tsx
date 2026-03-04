"use client";
import React from "react";
import { useRouter } from "next/navigation";

export default function FacebookAuthPage() {
  const router = useRouter();

  const handleLogin = () => {
    // Redireciona para o endpoint OAuth do Facebook
    window.location.href = "https://www.facebook.com/v18.0/dialog/oauth?client_id=SEU_FACEBOOK_APP_ID&redirect_uri=https://italosantos.com/auth/facebook/callback&scope=email,public_profile";
  };

  return (
    <div className="max-w-md mx-auto p-8">
      <h1 className="text-xl font-bold mb-4">Conectar Facebook</h1>
      <p className="mb-4">Clique abaixo para autenticar com o Facebook.</p>
      <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={handleLogin}>
        Login com Facebook
      </button>
    </div>
  );
}

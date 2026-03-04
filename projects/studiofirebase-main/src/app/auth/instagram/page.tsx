"use client";
import React from "react";
import { useRouter } from "next/navigation";

export default function InstagramAuthPage() {
  const router = useRouter();

  const handleLogin = () => {
    // Redireciona para o endpoint OAuth do Instagram
    window.location.href = "https://api.instagram.com/oauth/authorize?client_id=SEU_INSTAGRAM_APP_ID&redirect_uri=https://italosantos.com/auth/instagram/callback&scope=user_profile,user_media&response_type=code";
  };

  return (
    <div className="max-w-md mx-auto p-8">
      <h1 className="text-xl font-bold mb-4">Conectar Instagram</h1>
      <p className="mb-4">Clique abaixo para autenticar com o Instagram.</p>
      <button className="bg-pink-500 text-white px-4 py-2 rounded" onClick={handleLogin}>
        Login com Instagram
      </button>
    </div>
  );
}

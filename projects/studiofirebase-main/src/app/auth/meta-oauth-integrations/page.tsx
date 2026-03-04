import React from "react";

export default function MetaOAuthIntegrations() {
  return (
    <div className="max-w-lg mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Integração Meta OAuth</h1>
      <p className="mb-6">Conecte sua conta aos serviços Facebook, Instagram e WhatsApp para comunicação avançada.</p>
      <div className="space-y-4">
        <a href="/auth/facebook" className="block bg-blue-600 text-white px-4 py-2 rounded text-center">Conectar Facebook</a>
        <a href="/auth/instagram" className="block bg-pink-500 text-white px-4 py-2 rounded text-center">Conectar Instagram</a>
        <a href="/auth/whatsapp" className="block bg-green-500 text-white px-4 py-2 rounded text-center">Conectar WhatsApp</a>
      </div>
      <p className="mt-8 text-sm text-gray-500">Após conectar, você poderá enviar mensagens, sincronizar contatos e gerenciar conversas diretamente pelo painel.</p>
    </div>
  );
}

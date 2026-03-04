'use client'
import { useState } from "react";
import { FaFacebook, FaInstagram, FaTwitter, FaWhatsapp, FaPaypal, FaStripe, FaGoogle, FaApple } from "react-icons/fa";
import { SiMercadopago } from "react-icons/si";
import { signIn } from "next-auth/react";

interface ConnectionStatus {
  facebook: boolean;
  instagram: boolean;
  twitter: boolean;
  whatsapp: boolean;
  paypal: boolean;
  mercadopago: boolean;
  stripe: boolean;
  google: boolean;
  apple: boolean;
}

export function SocialConnectionsPanel({ initialStatus }: { initialStatus: ConnectionStatus }) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState<string | null>(null);

  // Função genérica para iniciar o fluxo OAuth
  const handleConnect = (provider: string) => {
    setLoading(provider);
    
    // Roteamento inteligente baseada no provedor
    const routes: Record<string, any> = {
      // Login / Auth (NextAuth)
      google: () => signIn("google"),
      apple: () => signIn("apple"),
      
      // Integrações de Mídia/Chat (Custom OAuth)
      facebook: "/api/auth/social/meta", // Escopos de Página + Chat
      instagram: "/api/auth/social/meta", // Mesmo fluxo Meta
      whatsapp: "/api/auth/social/whatsapp", // Fluxo Embedded Signup
      twitter: "/api/auth/social/twitter",
      
      // Integrações de Pagamento (Onboarding)
      mercadopago: `https://auth.mercadopago.com.br/authorization?client_id=${process.env.NEXT_PUBLIC_MP_APP_ID}&response_type=code&platform_id=mp&state=SELLER_ID&redirect_uri=${process.env.NEXT_PUBLIC_URL}/api/auth/mercadopago`,
      paypal: "/api/auth/payments/paypal/onboarding",
      stripe: "/api/auth/payments/stripe/connect",
    };

    const action = routes[provider];
    
    if (typeof action === 'function') {
      action(); // Executa NextAuth
    } else {
      window.location.href = action; // Redireciona para URL externa
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Central de Conexões</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* === MÍDIA SOCIAL & CHAT === */}
        <div className="col-span-full text-xs font-semibold text-gray-400 uppercase tracking-wider mt-4">
          Social & Comunicação (Feed + Chat)
        </div>

        <ConnectionCard 
          icon={<FaFacebook className="text-blue-600 w-8 h-8" />}
          name="Facebook"
          description="Páginas e Messenger"
          isConnected={status.facebook}
          onClick={() => handleConnect("facebook")}
          isLoading={loading === "facebook"}
        />

        <ConnectionCard 
          icon={<FaInstagram className="text-pink-600 w-8 h-8" />}
          name="Instagram"
          description="Feed de Fotos e Directs"
          isConnected={status.instagram}
          onClick={() => handleConnect("instagram")}
          isLoading={loading === "instagram"}
        />

        <ConnectionCard 
          icon={<FaWhatsapp className="text-green-500 w-8 h-8" />}
          name="WhatsApp Business"
          description="Atendimento Oficial API"
          isConnected={status.whatsapp}
          onClick={() => handleConnect("whatsapp")}
          isLoading={loading === "whatsapp"}
        />

        <ConnectionCard 
          icon={<FaTwitter className="text-black w-8 h-8" />}
          name="Twitter (X)"
          description="Feed e DM (Enterprise)"
          isConnected={status.twitter}
          onClick={() => handleConnect("twitter")}
          isLoading={loading === "twitter"}
        />

        {/* === PAGAMENTOS === */}
        <div className="col-span-full text-xs font-semibold text-gray-400 uppercase tracking-wider mt-4">
          Processadores de Pagamento
        </div>

        <ConnectionCard 
          icon={<SiMercadopago className="text-blue-500 w-8 h-8" />}
          name="Mercado Pago"
          description="QR Code Dinâmico (Pix)"
          isConnected={status.mercadopago}
          onClick={() => handleConnect("mercadopago")}
          isLoading={loading === "mercadopago"}
        />

        <ConnectionCard 
          icon={<FaPaypal className="text-blue-800 w-8 h-8" />}
          name="PayPal"
          description="Recebimento Global"
          isConnected={status.paypal}
          onClick={() => handleConnect("paypal")}
          isLoading={loading === "paypal"}
        />

        <ConnectionCard 
          icon={<FaStripe className="text-indigo-600 w-8 h-8" />}
          name="Stripe Connect"
          description="Apple Pay & Google Pay"
          isConnected={status.stripe}
          onClick={() => handleConnect("stripe")}
          isLoading={loading === "stripe"}
        />

        {/* === AUTENTICAÇÃO (LOGIN) === */}
        <div className="col-span-full text-xs font-semibold text-gray-400 uppercase tracking-wider mt-4">
          Login & Identidade
        </div>

        <ConnectionCard 
          icon={<FaGoogle className="text-red-500 w-8 h-8" />}
          name="Google"
          description="Login da Conta"
          isConnected={status.google}
          onClick={() => handleConnect("google")}
          isLoading={loading === "google"}
          isAuth={true}
        />

        <ConnectionCard 
          icon={<FaApple className="text-black w-8 h-8" />}
          name="Apple"
          description="Login da Conta"
          isConnected={status.apple}
          onClick={() => handleConnect("apple")}
          isLoading={loading === "apple"}
          isAuth={true}
        />

      </div>
    </div>
  );
}

// Componente Visual do Card Individual
function ConnectionCard({ icon, name, description, isConnected, onClick, isLoading, isAuth = false }: any) {
  return (
    <div className={`relative flex items-center p-4 border rounded-lg transition-all ${isConnected ? 'bg-green-50 border-green-200' : 'bg-white hover:shadow-md'}`}>
      <div className="mr-4">{icon}</div>
      <div className="flex-1">
        <h3 className="font-bold text-gray-900">{name}</h3>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      
      <button 
        onClick={onClick}
        disabled={isLoading || (isConnected && isAuth)}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors 
          ${isConnected 
            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
            : 'bg-black text-white hover:bg-gray-800'
          }`}
      >
        {isLoading ? "..." : isConnected ? "Conectado" : "Conectar"}
      </button>

      {isConnected && (
        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-green-500"></span>
      )}
    </div>
  );
}

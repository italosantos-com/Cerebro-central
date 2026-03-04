'use client';

import { useState, useEffect } from 'react';
import { FacebookIcon } from '@/components/icons/FacebookIcon';
import { InstagramIcon } from '@/components/icons/InstagramIcon';
import { TwitterIcon } from '@/components/icons/TwitterIcon';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { Loader2 } from 'lucide-react';
import { getAuth } from 'firebase/auth';

interface ConnectionStatus {
  facebook: boolean;
  instagram: boolean;
  twitter: boolean;
  whatsapp: boolean;
}

export function SocialConnectionsStatus() {
  const [connections, setConnections] = useState<ConnectionStatus>({
    facebook: false,
    instagram: false,
    twitter: false,
    whatsapp: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchConnectionStatus = async () => {
      try {
        const user = getAuth().currentUser;
        if (!user) {
          setIsLoading(false);
          return;
        }

        const idToken = await user.getIdToken();
        const response = await fetch('/api/admin/integrations/status', {
          headers: {
            'Authorization': `Bearer ${idToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setConnections({
            facebook: data.integrations?.facebook || false,
            instagram: data.integrations?.instagram || false,
            twitter: data.integrations?.twitter || false,
            whatsapp: data.integrations?.whatsapp || false,
          });
        }
      } catch (error) {
        console.error('Error fetching connection status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConnectionStatus();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-600">Carregando conexões...</span>
      </div>
    );
  }

  const socialPlatforms = [
    { name: 'Facebook', icon: FacebookIcon, connected: connections.facebook, color: 'bg-[#1877F2]' },
    { name: 'Instagram', icon: InstagramIcon, connected: connections.instagram, color: 'bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737]' },
    { name: 'Twitter', icon: TwitterIcon, connected: connections.twitter, color: 'bg-[#1DA1F2]' },
    { name: 'WhatsApp', icon: WhatsAppIcon, connected: connections.whatsapp, color: 'bg-[#25D366]' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-gray-50 rounded-lg border">
      <span className="text-sm font-medium text-gray-700">Redes Conectadas:</span>
      <div className="flex flex-wrap gap-2">
        {socialPlatforms.map((platform) => (
          <div
            key={platform.name}
            className={`relative flex items-center justify-center w-10 h-10 rounded-full ${
              platform.connected ? platform.color : 'bg-gray-300'
            } ${platform.connected ? 'opacity-100' : 'opacity-40'} transition-all`}
            title={`${platform.name} ${platform.connected ? 'conectado' : 'desconectado'}`}
          >
            <platform.icon />
            {!platform.connected && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full">
                <span className="text-white text-xs font-bold">✕</span>
              </div>
            )}
          </div>
        ))}
      </div>
      {!Object.values(connections).some(Boolean) && (
        <span className="text-xs text-gray-500 italic">
          Nenhuma rede conectada ainda
        </span>
      )}
    </div>
  );
}

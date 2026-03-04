'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFaceIDAuth } from '@/contexts/face-id-auth-context';
import { Loader2 } from 'lucide-react';

interface FaceIDProtectedRouteProps {
  children: React.ReactNode;
  requireVIP?: boolean;
  fallbackUrl?: string;
}

export default function FaceIDProtectedRoute({ 
  children, 
  requireVIP = false, 
  fallbackUrl = '/auth/face' 
}: FaceIDProtectedRouteProps) {
  const { isAuthenticated, userType } = useFaceIDAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push(fallbackUrl);
      return;
    }

    if (requireVIP && userType !== 'vip') {
      router.push('/dashboard'); // Redireciona não-VIPs para dashboard
      return;
    }
  }, [isAuthenticated, userType, requireVIP, router, fallbackUrl]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  if (requireVIP && userType !== 'vip') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Verificando permissões VIP...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

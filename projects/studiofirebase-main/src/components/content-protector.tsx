'use client';

import { ReactNode } from 'react';
import { useContentAccess } from '@/hooks/use-content-access';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Crown, Clock } from 'lucide-react';
import Link from 'next/link';

interface ContentProtectorProps {
  children: ReactNode;
  visibility?: 'public' | 'subscribers';
  showPreview?: boolean;
  className?: string;
}

export function ContentProtector({ 
  children, 
  visibility = 'public', 
  showPreview = false,
  className = '' 
}: ContentProtectorProps) {
  const { canAccessSubscriberContent, isSubscriptionActive, subscriptionPlan, subscriptionExpiry } = useContentAccess();

  // Se for conteúdo público, mostrar sempre
  if (visibility === 'public') {
    return <div className={className}>{children}</div>;
  }

  // Se for conteúdo de assinantes e o usuário tem acesso, mostrar
  if (visibility === 'subscribers' && canAccessSubscriberContent) {
    return <div className={className}>{children}</div>;
  }

  // Se chegou aqui, é conteúdo protegido e o usuário não tem acesso
  return (
    <div className={className}>
      {showPreview && (
        <div className="relative">
          <div className="blur-sm pointer-events-none">
            {children}
          </div>
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <Lock className="h-12 w-12 text-white/80" />
          </div>
        </div>
      )}
      
      <Card className="mt-4 border-amber-200 bg-amber-50">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Crown className="h-8 w-8 text-amber-600" />
          </div>
          <CardTitle className="text-amber-800">Conteúdo Exclusivo para Assinantes</CardTitle>
          <CardDescription className="text-amber-700">
            Este conteúdo está disponível apenas para usuários com assinatura ativa.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {isSubscriptionActive ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-amber-700">
                <Clock className="h-4 w-4" />
                <span className="text-sm">
                  Sua assinatura {subscriptionPlan} expira em{' '}
                  {subscriptionExpiry?.toLocaleDateString('pt-BR')}
                </span>
              </div>
              <p className="text-sm text-amber-600">
                Aguarde alguns instantes para que o sistema reconheça sua assinatura ativa.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-amber-700">
                Assine agora e tenha acesso ilimitado a todos os conteúdos exclusivos!
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button asChild className="bg-amber-600 hover:bg-amber-700">
                  <Link href="/assinante">
                    <Crown className="mr-2 h-4 w-4" />
                    Assinar Agora
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/auth">
                    Fazer Login
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ContentProtector;

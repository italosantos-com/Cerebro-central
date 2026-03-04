'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Crown, 
  Calendar, 
  Clock, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  Zap
} from 'lucide-react';
import { useSubscription } from '@/hooks/use-subscription';
import Link from 'next/link';

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export default function SubscriptionStatus() {
  const { hasActiveSubscription, subscription, plan, isLoading } = useSubscription();
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);

  useEffect(() => {
    if (!subscription?.expirationDate) return;

    const updateCountdown = () => {
      const now = new Date();
      const endDate = new Date(subscription.expirationDate);
      const timeDiff = endDate.getTime() - now.getTime();

      if (timeDiff <= 0) {
        setTimeRemaining(null);
        return;
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

      setTimeRemaining({ days, hours, minutes, seconds });
      setIsExpiringSoon(days <= 3); // Considera expirando em breve se restam 3 dias ou menos
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [subscription?.expirationDate]);

  if (isLoading) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm text-muted-foreground">Verificando assinatura...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasActiveSubscription) {
    return (
      <Card className="w-full max-w-md border-orange-200 bg-orange-50 dark:bg-orange-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
            <AlertTriangle className="w-5 h-5" />
            Sem Assinatura Ativa
          </CardTitle>
          <CardDescription className="text-orange-600 dark:text-orange-400">
            Assine para acessar conteúdo exclusivo
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div className="text-sm text-orange-700 dark:text-orange-300">
              💎 Galeria VIP com fotos e vídeos exclusivos<br/>
              📥 Downloads ilimitados durante 30 dias<br/>
              ⚡ Liberação instantânea após pagamento
            </div>
            <Link href="/assinante">
              <Button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
                <Crown className="w-4 h-4 mr-2" />
                Assinar por R$ 99,00
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`w-full max-w-md ${isExpiringSoon ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20' : 'border-green-200 bg-green-50 dark:bg-green-950/20'}`}>
      <CardHeader className="pb-3">
        <CardTitle className={`flex items-center gap-2 ${isExpiringSoon ? 'text-yellow-700 dark:text-yellow-300' : 'text-green-700 dark:text-green-300'}`}>
          {isExpiringSoon ? (
            <Clock className="w-5 h-5" />
          ) : (
            <CheckCircle className="w-5 h-5" />
          )}
          Assinatura Ativa
        </CardTitle>
        <CardDescription className={isExpiringSoon ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}>
          {plan?.name || 'Assinatura'} • R$ {plan?.price?.toFixed(2) || '99,00'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-4">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <Badge className={isExpiringSoon ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'}>
            <Shield className="w-3 h-3 mr-1" />
            {isExpiringSoon ? 'Expirando em Breve' : 'Acesso Liberado'}
          </Badge>
          <Badge variant="outline">
            <Zap className="w-3 h-3 mr-1" />
            {subscription?.paymentMethod?.toUpperCase() || 'PIX'}
          </Badge>
        </div>

        {/* Countdown Timer */}
        {timeRemaining && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="w-4 h-4" />
              <span>Tempo Restante:</span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="text-center p-2 bg-background rounded-lg border">
                <div className="text-lg font-bold">{timeRemaining.days}</div>
                <div className="text-xs text-muted-foreground">Dias</div>
              </div>
              <div className="text-center p-2 bg-background rounded-lg border">
                <div className="text-lg font-bold">{timeRemaining.hours}</div>
                <div className="text-xs text-muted-foreground">Horas</div>
              </div>
              <div className="text-center p-2 bg-background rounded-lg border">
                <div className="text-lg font-bold">{timeRemaining.minutes}</div>
                <div className="text-xs text-muted-foreground">Min</div>
              </div>
              <div className="text-center p-2 bg-background rounded-lg border">
                <div className="text-lg font-bold">{timeRemaining.seconds}</div>
                <div className="text-xs text-muted-foreground">Seg</div>
              </div>
            </div>
          </div>
        )}

        {/* Expiration Info */}
        {subscription?.expirationDate && (
          <div className="text-sm text-center">
            <span className="text-muted-foreground">Expira em:</span>
            <br />
            <span className="font-medium">
              {new Date(subscription.expirationDate).toLocaleDateString('pt-BR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        )}

        {/* Renewal Action */}
        {isExpiringSoon && (
          <Link href="/assinante">
            <Button className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700">
              <Crown className="w-4 h-4 mr-2" />
              Renovar Assinatura
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

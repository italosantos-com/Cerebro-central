"use client";

import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Mail, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthProvider';
import { useToast } from '@/hooks/use-toast';

export default function EmailVerificationBanner() {
  const { user, resendEmailVerification } = useAuth();
  const { toast } = useToast();
  const [isResending, setIsResending] = useState(false);

  // Verificar se está em localhost (modo debug)
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1' || 
     window.location.hostname.includes('localhost'));

  // Não mostrar se:
  // - Não há usuário
  // - Email já está verificado
  // - NÃO está em localhost (produção)
  if (!user || user.emailVerified || !isLocalhost) {
    return null;
  }

  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      await resendEmailVerification();
      toast({
        title: '📧 Email enviado!',
        description: 'Verifique sua caixa de entrada e clique no link de verificação.',
        duration: 5000,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar email',
        description: error.message || 'Tente novamente em alguns minutos.',
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckVerification = () => {
    // Recarregar a página para verificar se o email foi confirmado
    window.location.reload();
  };

  return (
    <Alert className="mb-4 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="flex items-center justify-between w-full">
        <div className="flex-1">
          <strong className="text-amber-800 dark:text-amber-200">
            📧 Verifique seu email <span className="text-xs opacity-60">(DEBUG - Localhost)</span>
          </strong>
          <p className="text-amber-700 dark:text-amber-300 mt-1">
            Enviamos um link de verificação para <strong>{user.email}</strong>. 
            Clique no link para ativar sua conta completamente.
          </p>
        </div>
        
        <div className="flex gap-2 ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCheckVerification}
            className="border-amber-300 text-amber-700 hover:bg-amber-100"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Já Verifiquei
          </Button>
          
          <Button
            variant="default"
            size="sm"
            onClick={handleResendVerification}
            disabled={isResending}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isResending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Reenviar Email
              </>
            )}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

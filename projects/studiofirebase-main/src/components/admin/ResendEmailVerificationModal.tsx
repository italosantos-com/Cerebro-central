"use client";

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail, Loader2 } from 'lucide-react';
import { resendVerificationEmail } from '@/services/email-verification-service';

interface ResendEmailVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmail?: string;
}

export default function ResendEmailVerificationModal({
  open,
  onOpenChange,
  defaultEmail = '',
}: ResendEmailVerificationModalProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const { toast } = useToast();

  // update local email when prop changes (or modal reopens)
  useEffect(() => {
    setEmail(defaultEmail);
  }, [defaultEmail, open]);

  // reset step whenever modal reopens
  useEffect(() => {
    if (open) {
      setStep('form');
      setPassword('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Informe seu email e senha para continuar.',
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await resendVerificationEmail(email.trim().toLowerCase(), password);

      if (result.success) {
        toast({
          title: 'Email enviado!',
          description: result.message,
        });
        setStep('success');
        setTimeout(() => {
          onOpenChange(false);
          setEmail(defaultEmail);
          setPassword('');
          setStep('form');
        }, 3000);
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro ao reenviar email',
          description: result.message,
        });
      }
    } catch (error: any) {
      console.error('[ResendEmailVerificationModal] Erro:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível reenviar o email de verificação.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setEmail(defaultEmail);
    setPassword('');
    setStep('form');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Reenviar Link de Ativação
          </DialogTitle>
          <DialogDescription>
            {step === 'form'
              ? 'Informe suas credenciais para reenviar o link de ativação da conta.'
              : 'Link de ativação enviado com sucesso!'}
          </DialogDescription>
        </DialogHeader>

        {step === 'form' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verify-email">Email</Label>
              <Input
                id="verify-email"
                type="email"
                placeholder="seu-email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="verify-password">Senha</Label>
              <Input
                id="verify-password"
                type="password"
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSubmit()}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <p>
                Um email contendo o link de ativação será enviado para <strong>{email || 'seu email'}</strong>.
                Clique no link dentro do email para ativar sua conta.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !email.trim() || !password}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Reenviar Email
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-6 text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 p-3">
                <svg
                  className="h-8 w-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              O email com o link de ativação foi enviado com sucesso para <strong>{email}</strong>.
            </p>
            <p className="text-sm text-muted-foreground">
              Verifique sua caixa de entrada (e a pasta de spam) e clique no link para ativar sua conta.
            </p>
            <Button onClick={handleClose} className="w-full mt-4">
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

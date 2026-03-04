"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Mail, CreditCard, CheckCircle, AlertTriangle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useFaceIDAuth } from '@/contexts/face-id-auth-context';
import { useAuth } from '@/contexts/AuthProvider';
import { useRouter } from 'next/navigation';

interface CpfVerificationModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  amount: number;
  onPaymentSuccess: () => void;
  currency?: string;
}

export default function CpfVerificationModal({ 
  isOpen, 
  onOpenChange, 
  amount, 
  onPaymentSuccess, 
  currency = 'BRL' 
}: CpfVerificationModalProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { userEmail, userType, isAuthenticated } = useFaceIDAuth();
  const { userProfile } = useAuth();
  
  const [cpf, setCpf] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Dados do usuário
  const email = userEmail || userProfile?.email || '';
  const name = userProfile?.displayName || '';

  const formatCpf = (value: string) => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, '');
    
    // Aplica a máscara
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCpf(e.target.value);
    setCpf(formatted);
  };

  const handleVerifyPayment = async () => {
    if (!cpf || cpf.replace(/\D/g, '').length !== 11) {
      toast({
        variant: 'destructive',
        title: 'CPF Inválido',
        description: 'Digite um CPF válido com 11 dígitos.'
      });
      return;
    }

    if (!email || !name) {
      toast({
        variant: 'destructive',
        title: 'Dados Incompletos',
        description: 'Email e nome são necessários para verificar o pagamento.'
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      

      const response = await fetch('/api/pix/verify-cpf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cpf: cpf.replace(/\D/g, ''), // Enviar apenas números
          email,
          name,
          amount
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erro ao verificar pagamento');
      }

      

      setSuccess(true);
      
      toast({
        title: '✅ Pagamento Confirmado!',
        description: result.message || 'Sua assinatura foi ativada com sucesso!',
      });

      // Aguardar um pouco antes de fechar o modal
      setTimeout(() => {
        onPaymentSuccess();
        handleClose();
      }, 2000);

    } catch (error: any) {
      
      
      let errorMessage = 'Erro ao verificar pagamento. Tente novamente.';
      
      if (error.message) {
        if (error.message.includes('Nenhum pagamento')) {
          errorMessage = 'Nenhum pagamento encontrado com este CPF. Verifique se o pagamento foi realizado corretamente.';
        } else if (error.message.includes('já foi confirmado')) {
          errorMessage = 'Este pagamento já foi confirmado anteriormente.';
        } else if (error.message.includes('CPF inválido')) {
          errorMessage = 'CPF inválido. Verifique o número e tente novamente.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Erro na Verificação',
        description: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after a short delay
    setTimeout(() => {
      setCpf('');
      setError(null);
      setSuccess(false);
      setIsLoading(false);
    }, 300);
  };

  if (!isAuthenticated) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Acesso Negado
            </DialogTitle>
            <DialogDescription>
              Você precisa estar logado para verificar pagamentos
            </DialogDescription>
          </DialogHeader>
          
          <div className="text-center py-6">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              Para verificar pagamentos, você precisa estar logado em sua conta.
            </p>
            <Button 
              onClick={() => {
                onOpenChange(false);
                router.push('/auth/face');
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Fazer Login
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Verificar Pagamento por CPF
          </DialogTitle>
          <DialogDescription>
            Digite seu CPF para verificar se o pagamento foi realizado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do pagamento */}
          <Alert>
            <AlertTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Detalhes do Pagamento
            </AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-1 text-sm">
                <p><strong>Valor:</strong> {currency === 'BRL' ? 'R$' : '$'} {amount.toFixed(2)}</p>
                <p><strong>Email:</strong> {email}</p>
                <p><strong>Nome:</strong> {name}</p>
              </div>
            </AlertDescription>
          </Alert>

          {success ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Pagamento Confirmado!</AlertTitle>
              <AlertDescription className="text-green-700">
                Sua assinatura foi ativada com sucesso. Redirecionando...
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Campo CPF */}
              <div className="space-y-2">
                <Label htmlFor="cpf" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  CPF
                </Label>
                <Input
                  id="cpf"
                  type="text"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={handleCpfChange}
                  maxLength={14}
                  disabled={isLoading}
                  className="font-mono"
                />
                <p className="text-xs text-gray-500">
                  Digite o CPF usado no pagamento PIX
                </p>
              </div>

              {/* Instruções */}
              <Alert>
                <AlertTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Como Funciona
                </AlertTitle>
                <AlertDescription>
                  <div className="mt-2 space-y-1 text-sm">
                    <p>1. Faça o pagamento PIX normalmente</p>
                    <p>2. Use o CPF da conta que fez o pagamento</p>
                    <p>3. O sistema verificará automaticamente no Mercado Pago</p>
                    <p>4. Se aprovado, sua assinatura será ativada</p>
                  </div>
                </AlertDescription>
              </Alert>

              {/* Erro */}
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Erro na Verificação</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Botões */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleVerifyPayment}
                  disabled={isLoading || !cpf || cpf.replace(/\D/g, '').length !== 11}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Verificar Pagamento
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

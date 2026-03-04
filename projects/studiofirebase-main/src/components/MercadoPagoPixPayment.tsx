/**
 * Componente de Pagamento PIX via Mercado Pago
 * Gera QR Code PIX para pagamentos na página inicial
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, CheckCircle2, QrCode } from 'lucide-react';
import Image from 'next/image';

interface MercadoPagoPixPaymentProps {
  amount: number; // Valor em reais
  description?: string;
  onSuccess?: (paymentId: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

interface PixPaymentData {
  id: string;
  qrCode: string;
  qrCodeBase64: string;
  pixCopiaECola: string;
  expiresAt: string;
}

export function MercadoPagoPixPayment({
  amount,
  description = 'Pagamento via PIX',
  onSuccess,
  onError,
  className,
}: MercadoPagoPixPaymentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [pixData, setPixData] = useState<PixPaymentData | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerCPF, setCustomerCPF] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Formatar CPF
  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return value;
  };

  // Formatar Telefone
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
    }
    return value;
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setCustomerCPF(formatted);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setCustomerPhone(formatted);
  };

  // Copiar código PIX
  const handleCopyPix = async () => {
    if (!pixData?.pixCopiaECola) return;

    try {
      await navigator.clipboard.writeText(pixData.pixCopiaECola);
      setCopied(true);
      toast({
        title: 'Código copiado!',
        description: 'Cole no app do seu banco para pagar.',
      });

      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar o código.',
      });
    }
  };

  // Gerar pagamento PIX
  const handleGeneratePix = async () => {
    // Validações
    if (!customerName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Nome obrigatório',
        description: 'Por favor, informe seu nome completo.',
      });
      return;
    }

    if (!customerEmail.trim() || !customerEmail.includes('@')) {
      toast({
        variant: 'destructive',
        title: 'Email inválido',
        description: 'Por favor, informe um email válido.',
      });
      return;
    }

    const cpfNumbers = customerCPF.replace(/\D/g, '');
    if (cpfNumbers.length !== 11) {
      toast({
        variant: 'destructive',
        title: 'CPF inválido',
        description: 'Por favor, informe um CPF válido com 11 dígitos.',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Import device fingerprint utility
      const { getOrCreateDeviceId } = await import('@/lib/device-fingerprint');
      const deviceId = getOrCreateDeviceId();

      const response = await fetch('/api/payments/mercadopago/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          description,
          customer: {
            name: customerName,
            email: customerEmail,
            cpf: cpfNumbers,
            ...(customerPhone && { phone: customerPhone.replace(/\D/g, '') }),
          },
          metadata: {
            device_id: deviceId,
            source: 'web_pix_component',
            timestamp: new Date().toISOString(),
          }
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erro ao gerar pagamento PIX');
      }

      setPixData({
        id: result.paymentId,
        qrCode: result.qrCode,
        qrCodeBase64: result.qrCodeBase64,
        pixCopiaECola: result.pixCopiaECola,
        expiresAt: result.expiresAt,
      });

      toast({
        title: 'QR Code gerado!',
        description: 'Escaneie o QR Code ou copie o código para pagar.',
      });

      // Iniciar polling para verificar pagamento
      startPaymentPolling(result.paymentId);
    } catch (error) {
      console.error('[MercadoPago PIX] Erro:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar PIX',
        description: errorMessage,
      });

      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Polling para verificar pagamento
  const startPaymentPolling = (paymentId: string) => {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutos (60 * 5s)

    const interval = setInterval(async () => {
      attempts++;

      if (attempts > maxAttempts) {
        clearInterval(interval);
        toast({
          title: 'Tempo esgotado',
          description: 'O QR Code expirou. Gere um novo para continuar.',
        });
        return;
      }

      try {
        const response = await fetch(`/api/payments/mercadopago/status/${paymentId}`);
        const result = await response.json();

        if (result.status === 'approved') {
          clearInterval(interval);
          toast({
            title: '✅ Pagamento aprovado!',
            description: 'Seu pagamento foi confirmado com sucesso.',
          });
          onSuccess?.(paymentId);
        } else if (result.status === 'rejected' || result.status === 'cancelled') {
          clearInterval(interval);
          toast({
            variant: 'destructive',
            title: 'Pagamento não realizado',
            description: 'O pagamento foi cancelado ou rejeitado.',
          });
        }
      } catch (error) {
        console.error('[Polling] Erro ao verificar status:', error);
      }
    }, 5000); // Verificar a cada 5 segundos
  };

  // Resetar para gerar novo pagamento
  const handleReset = () => {
    setPixData(null);
    setCustomerName('');
    setCustomerEmail('');
    setCustomerCPF('');
    setCustomerPhone('');
    setCopied(false);
  };

  if (pixData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Pagar com PIX
          </CardTitle>
          <CardDescription>
            Escaneie o QR Code ou copie o código para pagar R$ {amount.toFixed(2)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* QR Code */}
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-lg border">
              {pixData.qrCodeBase64 ? (
                <Image
                  src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                  alt="QR Code PIX"
                  width={256}
                  height={256}
                  className="rounded"
                />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center bg-gray-100 rounded">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              )}
            </div>
          </div>

          {/* Código Copia e Cola */}
          <div className="space-y-2">
            <Label>Código PIX (Copia e Cola)</Label>
            <div className="flex gap-2">
              <Input
                value={pixData.pixCopiaECola}
                readOnly
                className="font-mono text-xs"
              />
              <Button
                onClick={handleCopyPix}
                variant="outline"
                size="icon"
                className="shrink-0"
              >
                {copied ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Informações */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Abra o app do seu banco</p>
            <p>• Escolha PIX Copia e Cola ou escaneie o QR Code</p>
            <p>• Confirme o pagamento</p>
            <p className="text-xs mt-2">ID: {pixData.id}</p>
          </div>

          {/* Botão para gerar novo */}
          <Button onClick={handleReset} variant="outline" className="w-full">
            Gerar novo pagamento
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Pagamento via PIX
        </CardTitle>
        <CardDescription>
          Pague R$ {amount.toFixed(2)} com PIX do Mercado Pago
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome Completo *</Label>
          <Input
            id="name"
            placeholder="João Silva"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            placeholder="joao@email.com"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cpf">CPF *</Label>
          <Input
            id="cpf"
            placeholder="000.000.000-00"
            value={customerCPF}
            onChange={handleCPFChange}
            maxLength={14}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Telefone (opcional)</Label>
          <Input
            id="phone"
            placeholder="(11) 98765-4321"
            value={customerPhone}
            onChange={handlePhoneChange}
            maxLength={15}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            Fornecer seu telefone ajuda a melhorar a taxa de aprovação
          </p>
        </div>

        <Button
          onClick={handleGeneratePix}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gerando QR Code...
            </>
          ) : (
            <>
              <QrCode className="mr-2 h-4 w-4" />
              Gerar QR Code PIX
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

'use client';

import { useState } from 'react';
import { mercadopagoClient } from '@/lib/mercadopago-client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { QrCode, Copy, Check, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface PixPaymentModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  onPaymentSuccess?: (payment: any) => void;
}

export default function PixPaymentModal({
  isOpen,
  onOpenChange,
  amount,
  onPaymentSuccess,
}: PixPaymentModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<'form' | 'qrcode' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cpf: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Criar pagamento PIX via API
      const response = await fetch('/api/pix/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          email: formData.email,
          name: formData.name,
          cpf: formData.cpf.replace(/\D/g, ''),
          description: 'Assinatura Studio VIP',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Falha ao criar pagamento PIX');
      }

      const data = await response.json();
      setPaymentData(data);
      setStep('qrcode');

      // Iniciar verificação de pagamento
      startPaymentVerification(data.id);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '❌ Erro',
        description: error.message || 'Falha ao gerar PIX',
      });
    } finally {
      setLoading(false);
    }
  };

  const startPaymentVerification = async (paymentId: string) => {
    const maxAttempts = 60; // 5 minutos (60 x 5 segundos)
    let attempts = 0;

    const checkInterval = setInterval(async () => {
      attempts++;

      try {
        const response = await fetch('/api/pix/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payment_id: paymentId }),
        });

        const data = await response.json();

        if (data.approved) {
          clearInterval(checkInterval);
          setStep('success');
          toast({
            title: '✅ Pagamento Confirmado!',
            description: 'Seu pagamento PIX foi aprovado com sucesso!',
          });
          onPaymentSuccess?.(data);
        }
      } catch (error) {
        console.error('Erro ao verificar pagamento:', error);
      }

      if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        toast({
          variant: 'destructive',
          title: '⏱️ Tempo Expirado',
          description: 'O QR Code expirou. Tente novamente.',
        });
      }
    }, 5000); // Verificar a cada 5 segundos
  };

  const copyPixCode = () => {
    if (paymentData?.qrCode) {
      navigator.clipboard.writeText(paymentData.qrCode);
      setCopied(true);
      toast({
        title: '✅ Copiado!',
        description: 'Código PIX copiado para a área de transferência',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return numbers.slice(0, 11);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-[#00B1EA]" />
            Pagamento via PIX
          </DialogTitle>
        </DialogHeader>

        {/* Formulário */}
        {step === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="João Silva"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="joao@email.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                placeholder="000.000.000-00"
                maxLength={14}
                required
              />
            </div>

            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
              💰 Valor: <strong>R$ {amount.toFixed(2)}</strong>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando PIX...
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4 mr-2" />
                  Gerar QR Code PIX
                </>
              )}
            </Button>
          </form>
        )}

        {/* QR Code */}
        {step === 'qrcode' && paymentData && (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border">
              {paymentData.qrCodeBase64 ? (
                <Image
                  src={`data:image/png;base64,${paymentData.qrCodeBase64}`}
                  alt="QR Code PIX"
                  width={256}
                  height={256}
                  className="rounded-lg"
                />
              ) : (
                <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <QrCode className="w-16 h-16 text-gray-400" />
                </div>
              )}
            </div>

            <div>
              <Label>Código PIX (Copia e Cola)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={paymentData.qrCode || ''}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyPixCode}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <p>📱 <strong>Como pagar:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Abra o app do seu banco</li>
                <li>Escaneie o QR Code ou copie o código</li>
                <li>Confirme o pagamento</li>
                <li>Aguarde a confirmação automática</li>
              </ol>
            </div>

            <div className="bg-amber-50 p-3 rounded-lg text-sm text-amber-800">
              ⏱️ Aguardando pagamento... (expira em 30 minutos)
            </div>
          </div>
        )}

        {/* Sucesso */}
        {step === 'success' && (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-green-600">
                Pagamento Confirmado!
              </h3>
              <p className="text-gray-600 mt-2">
                Seu pagamento PIX foi aprovado com sucesso.
              </p>
            </div>
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Continuar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

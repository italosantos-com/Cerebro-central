'use client';

import { useState } from 'react';
import { useApplePayWithPayPal } from '@/hooks/useApplePayWithPayPal';
import { useGooglePayWithPayPal } from '@/hooks/useGooglePayWithPayPal';
import { Apple, Chrome, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import PixPaymentModal from './PixPaymentModal';

interface UnifiedPaymentButtonsProps {
  amount: string;
  currency?: string;
  onPaymentSuccess?: (payment: any) => void;
  showPixOption?: boolean;
}

export default function UnifiedPaymentButtons({
  amount,
  currency = 'USD',
  onPaymentSuccess,
  showPixOption = true,
}: UnifiedPaymentButtonsProps) {
  const { toast } = useToast();
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);

  // Apple Pay via PayPal
  const applePay = useApplePayWithPayPal({
    amount,
    currency,
    onSuccess: (payment) => {
      toast({
        title: '✅ Pagamento Aprovado',
        description: 'Seu pagamento via Apple Pay foi processado com sucesso!',
      });
      onPaymentSuccess?.(payment);
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: '❌ Erro no Pagamento',
        description: error.message || 'Falha ao processar Apple Pay',
      });
    },
  });

  // Google Pay via PayPal
  const googlePay = useGooglePayWithPayPal({
    amount,
    currency,
    onSuccess: (payment) => {
      toast({
        title: '✅ Pagamento Aprovado',
        description: 'Seu pagamento via Google Pay foi processado com sucesso!',
      });
      onPaymentSuccess?.(payment);
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: '❌ Erro no Pagamento',
        description: error.message || 'Falha ao processar Google Pay',
      });
    },
  });

  const handlePixPayment = () => {
    setIsPixModalOpen(true);
  };

  const handlePixSuccess = (payment: any) => {
    setIsPixModalOpen(false);
    onPaymentSuccess?.(payment);
  };

  return (
    <div className="space-y-4 w-full max-w-md mx-auto">
      {/* Apple Pay Button */}
      {applePay.isAvailable && (
        <Button
          onClick={applePay.initiatePayment}
          disabled={applePay.isProcessing}
          className="w-full h-12 bg-black text-white hover:bg-gray-800 rounded-lg flex items-center justify-center gap-2"
        >
          {applePay.isProcessing ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              <span>Processando...</span>
            </div>
          ) : (
            <>
              <Apple className="w-5 h-5" />
              <span>Pagar com Apple Pay</span>
            </>
          )}
        </Button>
      )}

      {/* Google Pay Button */}
      {googlePay.isAvailable && (
        <Button
          onClick={googlePay.initiatePayment}
          disabled={googlePay.isProcessing}
          className="w-full h-12 bg-white text-gray-800 border-2 border-gray-300 hover:bg-gray-50 rounded-lg flex items-center justify-center gap-2"
        >
          {googlePay.isProcessing ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-800 border-t-transparent" />
              <span>Processando...</span>
            </div>
          ) : (
            <>
              <Chrome className="w-5 h-5" />
              <span>Pagar com Google Pay</span>
            </>
          )}
        </Button>
      )}

      {/* PIX Button (Mercado Pago) */}
      {showPixOption && (
        <Button
          onClick={handlePixPayment}
          className="w-full h-12 bg-[#00B1EA] text-white hover:bg-[#0095c7] rounded-lg flex items-center justify-center gap-2"
        >
          <QrCode className="w-5 h-5" />
          <span>Pagar com PIX</span>
        </Button>
      )}

      {/* Informações */}
      <div className="text-center text-sm text-gray-600 space-y-1">
        <p>💳 Apple Pay e Google Pay via PayPal</p>
        {showPixOption && <p>🇧🇷 PIX via Mercado Pago (instantâneo)</p>}
        <p className="font-semibold">{currency} {amount}</p>
      </div>

      {/* Status de disponibilidade */}
      {!applePay.isAvailable && !googlePay.isAvailable && (
        <div className="text-center text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
          ⚠️ Carteiras digitais não disponíveis neste dispositivo.
          {showPixOption && <p className="mt-1">Use PIX para pagamento instantâneo!</p>}
        </div>
      )}

      {/* Modal PIX */}
      {showPixOption && (
        <PixPaymentModal
          isOpen={isPixModalOpen}
          onOpenChange={setIsPixModalOpen}
          amount={parseFloat(amount)}
          onPaymentSuccess={handlePixSuccess}
        />
      )}
    </div>
  );
}

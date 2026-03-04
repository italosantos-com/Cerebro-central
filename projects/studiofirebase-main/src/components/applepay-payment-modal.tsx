import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Lock } from 'lucide-react';
import StripeApplePayButton from '@/components/stripe-apple-pay-button';

interface ApplePayPaymentModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  currency: string;
  symbol: string;
  onPaymentSuccess: () => void;
}

const ApplePayPaymentModal: React.FC<ApplePayPaymentModalProps> = ({ isOpen, onOpenChange, amount, currency, symbol, onPaymentSuccess }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-2xl font-bold mb-2">Confirmar pagamento</h2>
          <p className="mb-1 text-4xl font-bold">{symbol} {amount.toFixed(2)}</p>
          <p className="mb-4 text-muted-foreground">Assinatura Mensal Premium</p>
          
          {/* Stripe Apple Pay Button (sandbox) */}
          <StripeApplePayButton
            amount={amount}
            currency={currency}
            onSuccess={() => { onPaymentSuccess(); onOpenChange(false); }}
            className="w-full h-12 text-lg"
          />

          <p className="text-xs text-muted-foreground mt-4">Apple Pay nativo indisponível neste dispositivo. Estamos usando um fluxo seguro alternativo.</p>

          <div className="text-xs text-muted-foreground mt-6 space-y-1">
            <p className="flex items-center justify-center">
              <Lock className="w-3 h-3 mr-1" /> Pagamento 100% seguro via Apple Pay
            </p>
            <p className="flex items-center justify-center">
              <Lock className="w-3 h-3 mr-1" /> Dados protegidos e criptografados
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ApplePayPaymentModal;

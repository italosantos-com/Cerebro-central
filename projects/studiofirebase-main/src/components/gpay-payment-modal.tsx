import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import StripeGooglePayButton from '@/components/stripe-google-pay-button';

interface GPayPaymentModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  currency: string;
  symbol: string;
  onPaymentSuccess: () => void;
  countryCode?: string; // Novo: código do país
}

const GPayPaymentModal: React.FC<GPayPaymentModalProps> = ({ 
  isOpen, 
  onOpenChange, 
  amount, 
  currency, 
  symbol, 
  onPaymentSuccess,
  countryCode = 'BR' // Padrão Brasil
}) => {
  const handleSuccess = () => {
    onPaymentSuccess();
    onOpenChange(false);
  };

  const handleError = (error: any) => {
    console.error('Erro no pagamento Google Pay:', error);
    // Manter modal aberto em caso de erro para o usuário tentar novamente
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            Pagamento via Google Pay
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center p-6 space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold">Confirmar pagamento</h3>
            <p className="text-2xl font-bold text-primary mt-2">
              {symbol} {amount.toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground">
              Assinatura Mensal Premium
            </p>
          </div>

          <div className="w-full">
            {/* Stripe Google Pay Button (sandbox) */}
            <StripeGooglePayButton
              amount={amount}
              currency={currency}
              onSuccess={handleSuccess}
              className="w-full"
            />
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              ✅ Pagamento 100% seguro via Google Pay
            </p>
            <p className="text-xs text-muted-foreground">
              🔒 Dados protegidos e criptografados
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GPayPaymentModal;

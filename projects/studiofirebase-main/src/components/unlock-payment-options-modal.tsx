"use client";

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CreditCard, QrCode, Apple, Chrome } from 'lucide-react';
import PixPaymentModal from '@/components/pix-payment-modal';
import GPayPaymentModal from '@/components/gpay-payment-modal';
import ApplePayPaymentModal from '@/components/applepay-payment-modal';
import PayPalHostedButtonsClean from '@/components/paypal-hosted-buttons-clean';

interface UnlockPaymentOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  currency: string;
  symbol: string;
  title?: string;
  onPaymentSuccess: (method: 'pix' | 'google' | 'apple' | 'paypal') => void;
}

export default function UnlockPaymentOptionsModal({
  isOpen,
  onClose,
  amount,
  currency,
  symbol,
  title,
  onPaymentSuccess,
}: UnlockPaymentOptionsModalProps) {
  const [isPixOpen, setIsPixOpen] = useState(false);
  const [isGPayOpen, setIsGPayOpen] = useState(false);
  const [isAppleOpen, setIsAppleOpen] = useState(false);
  const [showPayPal, setShowPayPal] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setShowPayPal(false);
    }
  }, [isOpen]);

  const openPix = () => {
    setIsPixOpen(true);
  };

  const openGPay = () => {
    setIsGPayOpen(true);
  };

  const openApple = () => {
    setIsAppleOpen(true);
  };

  const openPayPal = () => {
    setShowPayPal(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Desbloquear {title ? `"${title}"` : 'conteudo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border border-border p-3 bg-muted/30">
              <div className="text-sm text-muted-foreground">Valor para desbloqueio</div>
              <div className="text-2xl font-semibold">{symbol} {amount.toFixed(2)}</div>
            </div>

            <div className="grid gap-1.5">
              <Button variant="outline" className="justify-start" onClick={openPix}>
                <QrCode className="mr-2 h-4 w-4" />
                Pagar com Pix
              </Button>
              <Button variant="outline" className="justify-start" onClick={openGPay}>
                <Chrome className="mr-2 h-4 w-4" />
                Pagar com Google Pay
              </Button>
              <Button variant="outline" className="justify-start" onClick={openApple}>
                <Apple className="mr-2 h-4 w-4" />
                Pagar com Apple Pay
              </Button>
              <Button variant="outline" className="justify-start" onClick={openPayPal}>
                <CreditCard className="mr-2 h-4 w-4" />
                Pagar com PayPal
              </Button>
            </div>

            {showPayPal && (
              <div className="rounded-lg border border-border p-2 space-y-2">
                <PayPalHostedButtonsClean className="w-full" />
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => onPaymentSuccess('paypal')}
                >
                  Confirmar pagamento PayPal
                </Button>
                <p className="text-xs text-muted-foreground">
                  Após concluir o PayPal, toque em "Confirmar" para liberar o conteudo.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <PixPaymentModal
        isOpen={isPixOpen}
        onOpenChange={setIsPixOpen}
        amount={amount}
        onPaymentSuccess={() => onPaymentSuccess('pix')}
        paymentMethod="pix"
        currency={currency}
      />
      <GPayPaymentModal
        isOpen={isGPayOpen}
        onOpenChange={setIsGPayOpen}
        amount={amount}
        currency={currency}
        symbol={symbol}
        onPaymentSuccess={() => onPaymentSuccess('google')}
      />
      <ApplePayPaymentModal
        isOpen={isAppleOpen}
        onOpenChange={setIsAppleOpen}
        amount={amount}
        currency={currency}
        symbol={symbol}
        onPaymentSuccess={() => onPaymentSuccess('apple')}
      />
    </>
  );
}

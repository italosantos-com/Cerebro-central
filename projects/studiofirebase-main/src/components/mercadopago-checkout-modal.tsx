"use client";

import { useEffect, useMemo, useState } from 'react';
import { Wallet, initMercadoPago } from '@mercadopago/sdk-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFaceIDAuth } from '@/contexts/face-id-auth-context';
import { useAuth } from '@/contexts/AuthProvider';

interface MercadoPagoCheckoutModalProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    amount: number;
    currency: string;
    onPaymentSuccess?: (paymentDetails?: any) => void;
}

export default function MercadoPagoCheckoutModal({
    isOpen,
    onOpenChange,
    amount,
    currency,
    onPaymentSuccess,
}: MercadoPagoCheckoutModalProps) {
    const { toast } = useToast();
    const { userEmail } = useFaceIDAuth();
    const { user, userProfile } = useAuth();

    const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || '';
    const [payerEmail, setPayerEmail] = useState('');
    const [isCreatingPreference, setIsCreatingPreference] = useState(false);
    const [preferenceId, setPreferenceId] = useState<string | null>(null);
    const [initPoint, setInitPoint] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const payerName = useMemo(() => {
        return user?.displayName || userProfile?.displayName || 'Assinante';
    }, [user?.displayName, userProfile?.displayName]);

    useEffect(() => {
        if (!publicKey) return;
        initMercadoPago(publicKey, { locale: 'pt-BR' });
    }, [publicKey]);

    useEffect(() => {
        if (!isOpen) return;
        const defaultEmail = user?.email || userProfile?.email || userEmail || '';
        setPayerEmail(defaultEmail);
        setPreferenceId(null);
        setInitPoint(null);
        setErrorMessage(null);
    }, [isOpen, user?.email, userProfile?.email, userEmail]);

    const handleCreatePreference = async () => {
        if (!payerEmail.trim()) {
            setErrorMessage('E-mail é obrigatório para iniciar o checkout.');
            return;
        }

        setIsCreatingPreference(true);
        setErrorMessage(null);

        try {
            const response = await fetch('/api/create-preference', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount,
                    currency,
                    description: 'Assinatura Premium',
                    payer: {
                        name: payerName,
                        email: payerEmail.trim(),
                    },
                    metadata: {
                        source: 'home_pix_button_bricks_modal',
                        preferredMethods: ['mercado_credito', 'mercado_pago', 'pix'],
                    },
                }),
            });

            const data = await response.json();
            if (!response.ok || !data?.preferenceId) {
                throw new Error(data?.error || 'Falha ao criar checkout Mercado Pago.');
            }

            setPreferenceId(data.preferenceId);
            setInitPoint(data.initPoint || null);
            if (onPaymentSuccess) {
                onPaymentSuccess({ email: payerEmail.trim(), id: data.preferenceId });
            }
        } catch (error: any) {
            setErrorMessage(error?.message || 'Erro ao iniciar checkout Mercado Pago.');
            toast({
                variant: 'destructive',
                title: 'Falha no checkout',
                description: error?.message || 'Não foi possível abrir o checkout do Mercado Pago.',
            });
        } finally {
            setIsCreatingPreference(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Checkout Mercado Pago</DialogTitle>
                    <DialogDescription>
                        Finalize com Mercado Crédito, saldo Mercado Pago ou PIX.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="payer-email">E-mail (obrigatório)</Label>
                        <Input
                            id="payer-email"
                            type="email"
                            value={payerEmail}
                            onChange={(event) => setPayerEmail(event.target.value)}
                            placeholder="seu@email.com"
                        />
                    </div>

                    <div className="rounded-md border p-3 text-sm text-muted-foreground">
                        Valor: {currency} {amount.toFixed(2)}
                    </div>

                    {!preferenceId && (
                        <Button onClick={handleCreatePreference} disabled={isCreatingPreference || !publicKey} className="w-full">
                            {isCreatingPreference ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Preparando checkout...
                                </>
                            ) : (
                                'Abrir checkout flutuante'
                            )}
                        </Button>
                    )}

                    {!!preferenceId && publicKey && (
                        <div className="space-y-3">
                            <Wallet initialization={{ preferenceId }} />
                            {!!initPoint && (
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => window.open(initPoint, '_blank', 'noopener,noreferrer')}
                                >
                                    Abrir checkout em nova aba
                                </Button>
                            )}
                        </div>
                    )}

                    {!!errorMessage && (
                        <p className="text-sm text-destructive">{errorMessage}</p>
                    )}

                    {!publicKey && (
                        <p className="text-sm text-destructive">
                            NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY não configurada.
                        </p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

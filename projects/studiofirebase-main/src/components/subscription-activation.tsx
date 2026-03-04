'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Crown, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateSubscription } from '@/services/faceIdService';
import { useFaceIDAuth } from '@/contexts/face-id-auth-context';
import { useAuth } from '@/contexts/AuthProvider';

interface SubscriptionActivationProps {
  onActivationSuccess: () => void;
}

export default function SubscriptionActivation({ onActivationSuccess }: SubscriptionActivationProps) {
  const [paymentId, setPaymentId] = useState('');
  const [subscriptionType, setSubscriptionType] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { userEmail } = useFaceIDAuth();
  const { user } = useAuth();

  const handleActivateSubscription = async () => {
    if (!paymentId.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, insira o ID do pagamento.",
        variant: "destructive",
      });
      return;
    }

    const effectiveEmail = userEmail || user?.email;
    if (!effectiveEmail) {
      toast({
        title: "Erro de autenticação",
        description: "Usuário não autenticado. Entre com Google, Apple ou Face ID primeiro.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const result = await updateSubscription({
        customerEmail: effectiveEmail,
        paymentId: paymentId.trim(),
        subscriptionType,
        subscriptionDuration: subscriptionType === 'monthly' ? 1 : 12
      });

      if (result.success) {
        toast({
          title: "Assinatura ativada!",
          description: result.message,
          duration: 5000,
        });

        // Salvar no localStorage para cache
        localStorage.setItem('hasSubscription', 'true');
        localStorage.setItem('userSubscription', JSON.stringify({
          type: subscriptionType,
          isActive: true,
          endDate: result.subscriptionEndDate
        }));

        onActivationSuccess();
      } else {
        toast({
          title: "Erro na ativação",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao ativar assinatura:', error);
      toast({
        title: "Erro de conexão",
        description: "Não foi possível conectar ao servidor. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <Crown className="h-12 w-12 text-white" />
        </div>
        <CardTitle className="text-2xl">Ativar Assinatura Premium</CardTitle>
        <CardDescription>
          Insira os dados do seu pagamento para ativar a assinatura
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="paymentId">ID do Pagamento</Label>
          <Input
            id="paymentId"
            placeholder="Ex: PAY-1234567890"
            value={paymentId}
            onChange={(e) => setPaymentId(e.target.value)}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            Você receberá este ID por email após efetuar o pagamento
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subscriptionType">Tipo de Assinatura</Label>
          <select
            id="subscriptionType"
            value={subscriptionType}
            onChange={(e) => setSubscriptionType(e.target.value)}
            disabled={loading}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="monthly">Mensal</option>
            <option value="yearly">Anual</option>
          </select>
        </div>

        <Button
          onClick={handleActivateSubscription}
          disabled={loading || !paymentId.trim()}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Ativando...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Ativar Assinatura
            </>
          )}
        </Button>

        <div className="mt-6 p-4 bg-gray-900 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-gray-400 mt-0.5" />
            <div className="text-sm text-gray-300">
              <p className="font-medium">Como ativar sua assinatura:</p>
              <ol className="mt-2 list-decimal list-inside space-y-1">
                <li>Efetue o pagamento através dos métodos disponíveis</li>
                <li>Aguarde o email de confirmação com o ID do pagamento</li>
                <li>Insira o ID do pagamento no campo acima</li>
                <li>Clique em &quot;Ativar Assinatura&quot;</li>
              </ol>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

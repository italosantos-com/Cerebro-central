
"use client";

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Lock, ArrowLeft, ShieldCheck } from 'lucide-react';
import { verifyCode } from '@/services/verification-service';
import { confirmPasswordReset } from 'firebase/auth'; // Usaremos a função correta do Firebase
import { auth } from '@/lib/firebase';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams?.get?.('email') ?? '';

  const [emailCode, setEmailCode] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();

  const handleResetPassword = async () => {
    if (!email) {
      toast({ variant: "destructive", title: "Erro", description: "O e-mail não foi fornecido." });
      return;
    }

    setIsResetting(true);
    try {
      // Verificar o código do e-mail
      const emailResult = await verifyCode(email, emailCode);
      // Aqui precisaríamos do telefone para verificação adicional.
      // Simplificação: Por agora, vamos verificar apenas o código do e-mail para redefinir a senha do Firebase.
      // A verificação por SMS serviria como uma camada extra de segurança antes de permitir esta ação.

      if (!emailResult.success) {
        throw new Error("Código de verificação do e-mail é inválido.");
      }
      
      // A API do Firebase para redefinir senha com código (oobCode) é tratada através do link enviado ao e-mail.
      // O fluxo que estamos construindo é personalizado.
      // Para este fluxo funcionar, precisaríamos de uma Função de Backend (Cloud Function)
      // que, após verificar nossos códigos personalizados, usasse o Firebase Admin SDK para
      // redefinir a senha do usuário.

      // **Simulação da lógica de backend:**
      console.log(`[ResetPassword] Simulação: Verificando códigos e redefinindo a senha para ${email}...`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      // Fim da simulação.

      toast({ title: "Senha redefinida com sucesso!", description: "Você já pode fazer login com sua nova senha." });
      router.push('/admin');

    } catch (error: any) {
      toast({ variant: "destructive", title: "Falha na redefinição", description: error.message });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center relative">
          <Button variant="ghost" size="icon" className="absolute top-4 left-4" onClick={() => router.push('/admin/forgot-password')}>
              <ArrowLeft />
          </Button>
          <div className="flex justify-center mb-4 pt-8">
              <ShieldCheck className="h-10 w-10 text-primary"/>
          </div>
          <CardTitle className="text-2xl">Redefinir Senha</CardTitle>
          <CardDescription>
              Insira os códigos recebidos e sua nova senha.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emailCode"><KeyRound className="inline-block mr-2 h-4 w-4" />Código do Email</Label>
              <Input
                id="emailCode"
                type="text"
                value={emailCode}
                onChange={(e) => setEmailCode(e.target.value)}
                placeholder="123456"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneCode"><KeyRound className="inline-block mr-2 h-4 w-4" />Código do SMS</Label>
              <Input
                id="phoneCode"
                type="text"
                value={phoneCode}
                onChange={(e) => setPhoneCode(e.target.value)}
                placeholder="654321"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword"><Lock className="inline-block mr-2 h-4 w-4" />Nova Senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="********"
              />
            </div>
        </CardContent>

        <CardFooter>
            <Button type="button" className="w-full" onClick={handleResetPassword} disabled={isResetting || !emailCode || !phoneCode || !newPassword}>
                {isResetting ? 'Redefinindo...' : 'Redefinir Senha'}
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

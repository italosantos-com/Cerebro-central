
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowLeft, ShieldCheck, CheckCircle } from 'lucide-react';
import { sendAdminPasswordResetEmail } from '@/services/admin-auth-service';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSendPasswordReset = async () => {
    if (!email) {
        toast({ variant: "destructive", title: "Email necessário", description: "Por favor, insira seu email." });
        return;
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        toast({ variant: "destructive", title: "Email inválido", description: "Por favor, insira um email válido." });
        return;
    }

    setIsSending(true);

    try {
      console.log('[Forgot Password] Enviando email de recuperação para:', email);
      
      // Usar a função do Firebase para enviar email de recuperação
      await sendAdminPasswordResetEmail(email);
      
      console.log('[Forgot Password] Email enviado com sucesso');
      setEmailSent(true);
      
      toast({ 
        title: "Email enviado!", 
        description: "Verifique sua caixa de entrada para redefinir sua senha." 
      });

    } catch (error: any) {
        console.error('[Forgot Password] Erro ao enviar email:', error);
        
        let errorMessage = "Não foi possível enviar o email de recuperação.";
        
        // Mensagens de erro específicas do Firebase
        if (error.code === 'auth/user-not-found') {
          errorMessage = "Nenhuma conta encontrada com este email.";
        } else if (error.code === 'auth/invalid-email') {
          errorMessage = "Email inválido.";
        } else if (error.code === 'auth/too-many-requests') {
          errorMessage = "Muitas tentativas. Tente novamente mais tarde.";
        }
        
        toast({ 
          variant: "destructive", 
          title: "Erro", 
          description: errorMessage 
        });
    } finally {
        setIsSending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center relative">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-4 left-4" 
            onClick={() => router.push('/admin')}
          >
            <ArrowLeft />
          </Button>
          <div className="flex justify-center mb-4 pt-8">
             <ShieldCheck className="h-10 w-10 text-primary"/>
          </div>
          <CardTitle className="text-2xl">Recuperar Senha</CardTitle>
          <CardDescription>
            {emailSent 
              ? "Email de recuperação enviado com sucesso!" 
              : "Insira seu email de administrador para receber o link de recuperação."
            }
          </CardDescription>
        </CardHeader>
        
        {!emailSent ? (
          <>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">
                    <Mail className="inline-block mr-2 h-4 w-4" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendPasswordReset()}
                    placeholder="admin@exemplo.com"
                    disabled={isSending}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Você receberá um email com instruções para redefinir sua senha.
                </p>
            </CardContent>

            <CardFooter className="flex flex-col gap-2">
                <Button 
                  type="button" 
                  className="w-full" 
                  onClick={handleSendPasswordReset} 
                  disabled={isSending || !email}
                >
                    {isSending ? 'Enviando...' : 'Enviar Link de Recuperação'}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => router.push('/admin')}
                  disabled={isSending}
                >
                  Voltar ao Login
                </Button>
            </CardFooter>
          </>
        ) : (
          <>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center justify-center space-y-4 py-4">
                <CheckCircle className="h-16 w-16 text-green-500" />
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Um email foi enviado para:
                  </p>
                  <p className="font-medium">{email}</p>
                  <p className="text-xs text-muted-foreground mt-4">
                    Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
                    Não se esqueça de verificar a pasta de spam.
                  </p>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-2">
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => {
                    setEmailSent(false);
                    setEmail('');
                  }}
                >
                  Enviar Novamente
                </Button>
                <Button 
                  className="w-full" 
                  onClick={() => router.push('/admin')}
                >
                  Voltar ao Login
                </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}

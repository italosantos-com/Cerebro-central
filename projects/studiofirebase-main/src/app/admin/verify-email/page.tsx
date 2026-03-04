"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MailCheck, ShieldCheck } from "lucide-react";
import { onAuthStateChanged, sendEmailVerification, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getBaseUrl } from "@/lib/utils";

export default function VerifyEmailPage() {
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const actionUrl = `${getBaseUrl()}/auth/action?context=admin&redirect=/admin/register`;
      await sendEmailVerification(user, {
        url: actionUrl,
        handleCodeInApp: true
      });
      toast({ title: "Email de verificação enviado!", description: "Verifique sua caixa de entrada para confirmar." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao enviar verificação", description: err.message });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto mt-10">
      <CardHeader>
        <CardTitle>
          <MailCheck className="inline-block mr-2" /> Verificar Email
        </CardTitle>
        <CardDescription>Confirme seu email para ativar sua conta.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>Confirme seu email para ativar sua conta. Clique abaixo para reenviar o email de verificação.</p>
      </CardContent>
      <CardFooter>
        <Button onClick={handleVerify} disabled={isVerifying} className="w-full">
          {isVerifying ? "Enviando..." : "Enviar Verificação"}
        </Button>
      </CardFooter>
    </Card>
  );
}

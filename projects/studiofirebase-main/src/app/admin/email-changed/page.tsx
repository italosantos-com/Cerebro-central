"use client";

import { useEffect, useState } from "react";
import { EmailAuthProvider, onAuthStateChanged, reauthenticateWithCredential, type User, verifyBeforeUpdateEmail } from "firebase/auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MailCheck, ShieldCheck } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { getBaseUrl } from "@/lib/utils";


export default function EmailChangedPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isChanged, setIsChanged] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  const updateUserEmail = async (newEmail: string, currentPassword: string) => {
    if (!user) {
      throw new Error("Usuário não autenticado. Faça login novamente.");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      throw new Error("Email inválido");
    }

    if (!user.email) {
      throw new Error("Usuário não possui email cadastrado.");
    }

    const hasEmailProvider = user.providerData.some((provider) => provider.providerId === "password");
    if (!hasEmailProvider) {
      throw new Error("Conta sem login por email/senha. Contate o suporte.");
    }

    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    const actionUrl = `${getBaseUrl()}/auth/action`;
    await verifyBeforeUpdateEmail(user, newEmail, {
      url: actionUrl,
      handleCodeInApp: true
    });
  };

  const handleEmailChanged = async () => {
    setLoading(true);
    try {
      await updateUserEmail(email, password);
      setIsChanged(true);
      toast({ title: "Email alterado!", description: "Verifique sua caixa de entrada para confirmar o novo email." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao alterar email", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto mt-10">
      <CardHeader>
        <CardTitle>
          <MailCheck className="inline-block mr-2" /> Email Alterado
        </CardTitle>
        <CardDescription>Confirme que seu email foi alterado com sucesso.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Label htmlFor="email">Novo Email</Label>
        <Input id="email" value={email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} placeholder="seu@email.com" />
        <Label htmlFor="password">Senha Atual</Label>
        <Input id="password" type="password" value={password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} placeholder="Digite sua senha atual" />
      </CardContent>
      <CardFooter>
        <Button onClick={handleEmailChanged} disabled={isChanged || loading} className="w-full">
          {loading ? "Salvando..." : isChanged ? "Email já alterado" : "Confirmar Alteração"}
        </Button>
      </CardFooter>
    </Card>
  );
}

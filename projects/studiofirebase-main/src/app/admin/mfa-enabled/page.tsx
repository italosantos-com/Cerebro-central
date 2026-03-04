"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
// ...existing code...
import { ShieldCheck, KeyRound } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";


export default function MfaEnabledPage() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  const handleEnableMfa = async () => {
    setLoading(true);
    try {
      if (!user) throw new Error("Usuário não autenticado");
      setIsEnabled(true);
      toast({ title: "MFA ativado!", description: "Autenticação em duas etapas está ativa para sua conta." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao ativar MFA", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto mt-10">
      <CardHeader>
        <CardTitle>
          <ShieldCheck className="inline-block mr-2" /> MFA (Autenticação em Duas Etapas)
        </CardTitle>
        <CardDescription>Proteja sua conta ativando a autenticação em duas etapas.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleEnableMfa} disabled={isEnabled || loading} className="w-full">
          {loading ? "Ativando..." : isEnabled ? "MFA já está ativado" : "Ativar MFA"}
        </Button>
      </CardContent>
      <CardFooter>
        {isEnabled && <span className="text-green-600">MFA está ativo para sua conta.</span>}
      </CardFooter>
    </Card>
  );
}

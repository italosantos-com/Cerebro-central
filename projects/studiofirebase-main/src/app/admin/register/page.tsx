
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, ArrowLeft, User } from 'lucide-react';
import FaceIDSetup from '@/components/face-id-setup';
import AdminDualFirebaseUi from '@/components/admin/AdminDualFirebaseUi';
import { getAuth } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { SUPERADMIN_USERNAME } from '@/lib/superadmin-config';

export default function AdminRegisterPage() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameValidation, setUsernameValidation] = useState<{ valid: boolean; message: string } | null>(null);
  const [isValidatingUsername, setIsValidatingUsername] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const validateUsernameLocal = (value: string): { valid: boolean; message: string } => {
    const clean = value.toLowerCase().trim();
    const usernameRegex = /^[a-z0-9-_]{3,20}$/;
    if (!usernameRegex.test(clean)) {
      return { valid: false, message: 'Username deve ter 3-20 caracteres (apenas letras minúsculas, números, - e _)' };
    }
    const reservedUsernames = [
      'admin', 'api', 'auth', 'dashboard', 'login', 'register',
      'logout', 'perfil', 'assinante', 'galeria', 'fotos', 'videos',
      'chat', 'loja', 'stripe', 'paypal', 'pix', 'app', 'www'
    ];
    if (reservedUsernames.includes(clean)) {
      return { valid: false, message: 'Este username está reservado pelo sistema' };
    }
    return { valid: true, message: 'Formato de username OK' };
  };

  const handleDualComplete = async () => {
    try {
      if (!name.trim()) {
        throw new Error('Informe seu nome antes de continuar.');
      }
      if (!username.trim()) {
        throw new Error('Informe um username antes de continuar.');
      }
      if (usernameValidation && !usernameValidation.valid) {
        throw new Error('Username inválido ou já em uso.');
      }
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado após verificação.');
      if (!user.emailVerified) throw new Error('E-mail não verificado.');
      if (!user.phoneNumber) throw new Error('Telefone não vinculado.');

      toast({ title: 'Verificação concluída!', description: 'Continue para o cadastro facial.' });
      setStep(2);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Falha ao concluir verificação', description: e?.message || 'Erro desconhecido' });
    }
  };

  const handleRegistrationSuccess = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado.');

      const idToken = await user.getIdToken(true);
      const response = await fetch('/api/admin/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          name,
          phone: user.phoneNumber ?? undefined,
          username,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Falha ao finalizar cadastro no servidor.');
      }

      toast({ title: "Cadastro de administrador concluído!", description: "Você será redirecionado para o painel de administração." });
      router.push('/admin');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao finalizar cadastro", description: error.message || "Tente novamente mais tarde." });
    }
  };

  const handleUsernameChange = async (value: string) => {
    setUsername(value);
    setUsernameValidation(null);
    
    if (!value.trim()) return;
    
    const localValidation = validateUsernameLocal(value);
    if (!localValidation.valid) {
      setUsernameValidation(localValidation);
      return;
    }

    setIsValidatingUsername(true);
    try {
      const clean = value.toLowerCase().trim();

      // Check against SuperAdmin username
      if (clean === SUPERADMIN_USERNAME.toLowerCase()) {
        setUsernameValidation({ valid: false, message: 'Este username está reservado para o SuperAdmin' });
        return;
      }

      // Check against admins collection
      const adminsRef = collection(db, 'admins');
      const q = query(adminsRef, where('username', '==', clean), limit(1));
      const snap = await getDocs(q);

      if (!snap.empty) {
        setUsernameValidation({ valid: false, message: 'Este username já está em uso' });
      } else {
        setUsernameValidation({ valid: true, message: 'Username disponível!' });
      }
    } catch (error) {
      console.error('Erro ao validar username:', error);
      setUsernameValidation({ valid: false, message: 'Erro ao verificar disponibilidade' });
    } finally {
      setIsValidatingUsername(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center relative">
          <Button variant="ghost" size="icon" className="absolute top-4 left-4" onClick={() => router.push('/admin')}>
            <ArrowLeft />
          </Button>
          <div className="flex justify-center mb-4 pt-8">
            <ShieldCheck className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Cadastro de Administrador</CardTitle>
          <CardDescription>
            {step === 1 ? "Preencha seus dados para se cadastrar." : "Realize o cadastro facial para continuar."}
          </CardDescription>
        </CardHeader>

        {step === 1 && (
          <>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name"><User className="inline-block mr-2 h-4 w-4" />Nome</Label>
                <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome completo" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username (URL do seu perfil)</Label>
                <Input 
                  id="username" 
                  type="text" 
                  value={username} 
                  onChange={(e) => handleUsernameChange(e.target.value)} 
                  placeholder="exemplo: severepics"
                  className={usernameValidation ? (usernameValidation.valid ? 'border-green-500' : 'border-red-500') : ''}
                />
                {isValidatingUsername && <p className="text-xs text-muted-foreground">Verificando disponibilidade...</p>}
                {usernameValidation && (
                  <p className={`text-xs ${usernameValidation.valid ? 'text-green-600' : 'text-red-600'}`}>
                    {usernameValidation.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Seu perfil público será: italosantos.com/{username || 'seu-username'}
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Para se cadastrar como administrador, complete os dois passos do FirebaseUI:</p>
                <ol className="list-decimal text-sm pl-4 space-y-1 text-muted-foreground">
                  <li>Criar conta com Email e verificar o e-mail</li>
                  <li>Vincular número de telefone via SMS</li>
                </ol>
              </div>

              <AdminDualFirebaseUi onComplete={handleDualComplete} />
            </CardContent>
          </>
        )}

        {step === 2 && (
          <CardContent>
            <FaceIDSetup onRegistrationSuccess={handleRegistrationSuccess} userEmail={(typeof window !== 'undefined' ? (getAuth().currentUser?.email || '') : '')} />
          </CardContent>
        )}
      </Card>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, Phone, Loader2 } from "lucide-react";
import { EmailAuthProvider, onAuthStateChanged, reauthenticateWithCredential, type User, updatePassword, verifyBeforeUpdateEmail } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { getBaseUrl } from "@/lib/utils";

const MIN_PASSWORD_LENGTH = 6;

export default function SecuritySettings() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);

  // Email change state
  const [newEmail, setNewEmail] = useState("");
  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  // Phone change state
  const [newPhone, setNewPhone] = useState("");
  const [currentPasswordForPhone, setCurrentPasswordForPhone] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  const updateUserEmail = async (newEmail: string, currentPasswordForUpdate: string) => {
    if (!user) throw new Error("Usuário não autenticado");

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

    const credential = EmailAuthProvider.credential(user.email, currentPasswordForUpdate);
    await reauthenticateWithCredential(user, credential);

    const actionUrl = `${getBaseUrl()}/auth/action`;
    await verifyBeforeUpdateEmail(user, newEmail, {
      url: actionUrl,
      handleCodeInApp: true
    });
  };

  const updateUserPhone = async (newPhone: string, currentPasswordForUpdate: string) => {
    if (!user) throw new Error("Usuário não autenticado");
    if (!user.email) throw new Error("Usuário não possui email cadastrado.");

    // Validate phone format (international format)
    const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
    if (!phoneRegex.test(newPhone.replace(/\s/g, ''))) {
      throw new Error("Formato de telefone inválido");
    }

    // Require reauthentication for phone changes
    const credential = EmailAuthProvider.credential(user.email, currentPasswordForUpdate);
    await reauthenticateWithCredential(user, credential);

    // Update phone in Firestore users collection
    await updateDoc(doc(db, "users", user.uid), {
      phone: newPhone
    });
  };

  const updateUserPassword = async (currentPasswordForUpdate: string, newPasswordForUpdate: string) => {
    if (!user) throw new Error("Usuário não autenticado");
    if (!user.email) throw new Error("Usuário não possui email cadastrado.");

    const credential = EmailAuthProvider.credential(user.email, currentPasswordForUpdate);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPasswordForUpdate);
  };

  const onChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !currentPasswordForEmail) {
      toast({
        title: "Erro",
        description: "Informe o novo email e a senha atual",
        variant: "destructive"
      });
      return;
    }
    try {
      setSavingEmail(true);
      await updateUserEmail(newEmail, currentPasswordForEmail);
      toast({
        title: "Sucesso",
        description: "Verifique sua caixa de entrada para confirmar o novo email"
      });
      setNewEmail("");
      setCurrentPasswordForEmail("");
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.message || "Erro ao atualizar email",
        variant: "destructive"
      });
    } finally {
      setSavingEmail(false);
    }
  };

  const onChangePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone || !currentPasswordForPhone) {
      toast({
        title: "Erro",
        description: "Informe o novo telefone e a senha atual",
        variant: "destructive"
      });
      return;
    }
    try {
      setSavingPhone(true);
      await updateUserPhone(newPhone, currentPasswordForPhone);
      toast({
        title: "Sucesso",
        description: "Telefone atualizado com sucesso"
      });
      setNewPhone("");
      setCurrentPasswordForPhone("");
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.message || "Erro ao atualizar telefone",
        variant: "destructive"
      });
    } finally {
      setSavingPhone(false);
    }
  };

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast({
        title: "Erro",
        description: "Informe a senha atual e a nova senha",
        variant: "destructive"
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive"
      });
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      toast({
        title: "Erro",
        description: `A nova senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`,
        variant: "destructive"
      });
      return;
    }
    try {
      setSavingPassword(true);
      await updateUserPassword(currentPassword, newPassword);
      toast({
        title: "Sucesso",
        description: "Senha atualizada com sucesso"
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.message || "Erro ao atualizar senha",
        variant: "destructive"
      });
    } finally {
      setSavingPassword(false);
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Carregando...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Alterar Email
          </CardTitle>
          <CardDescription>
            Você receberá um email de verificação para confirmar a troca
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onChangeEmail} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentEmail">Email atual</Label>
              <Input
                id="currentEmail"
                type="email"
                value={user?.email || ""}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newEmail">Novo email</Label>
              <Input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="novo@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentPasswordForEmail">Senha atual</Label>
              <Input
                id="currentPasswordForEmail"
                type="password"
                value={currentPasswordForEmail}
                onChange={(e) => setCurrentPasswordForEmail(e.target.value)}
                placeholder="Sua senha atual"
              />
            </div>
            <Button type="submit" disabled={savingEmail}>
              {savingEmail ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Atualizando...
                </>
              ) : (
                "Atualizar email"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Alterar Telefone
          </CardTitle>
          <CardDescription>
            Atualize seu número de telefone de contato
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onChangePhone} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPhone">Novo telefone</Label>
              <Input
                id="newPhone"
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+55 11 99999-9999"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentPasswordForPhone">Senha atual</Label>
              <Input
                id="currentPasswordForPhone"
                type="password"
                value={currentPasswordForPhone}
                onChange={(e) => setCurrentPasswordForPhone(e.target.value)}
                placeholder="Sua senha atual"
              />
            </div>
            <Button type="submit" disabled={savingPhone}>
              {savingPhone ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Atualizando...
                </>
              ) : (
                "Atualizar telefone"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Alterar Senha
          </CardTitle>
          <CardDescription>
            Defina uma nova senha segura
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Senha atual</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Sua senha atual"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={`Nova senha (mínimo ${MIN_PASSWORD_LENGTH} caracteres)`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Digite a nova senha novamente"
              />
            </div>
            <Button type="submit" disabled={savingPassword}>
              {savingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Atualizando...
                </>
              ) : (
                "Atualizar senha"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

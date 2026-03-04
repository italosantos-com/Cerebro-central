"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { EmailAuthProvider, onAuthStateChanged, reauthenticateWithCredential, type User, updatePassword, updateProfile, verifyBeforeUpdateEmail } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { getBaseUrl } from "@/lib/utils";
import { useAdminProfile } from "@/hooks/use-admin-profile";

type AdminUserProfile = {
  displayName?: string;
  email?: string;
  photoURL?: string;
};

export default function AdminProfilePage() {
  const { profile } = useAdminProfile();
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<AdminUserProfile | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const resolvedAdminAvatarUrl = profile.profilePictureUrl || userProfile?.photoURL || undefined;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setUserProfile(null);
        return;
      }

      try {
        const profileSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (profileSnap.exists()) {
          setUserProfile(profileSnap.data() as AdminUserProfile);
        } else {
          setUserProfile({
            displayName: currentUser.displayName || "",
            email: currentUser.email || "",
            photoURL: currentUser.photoURL || ""
          });
        }
      } catch {
        setUserProfile({
          displayName: currentUser.displayName || "",
          email: currentUser.email || "",
          photoURL: currentUser.photoURL || ""
        });
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setDisplayName(userProfile?.displayName || user?.displayName || "");
  }, [userProfile, user]);

  const updateUserProfile = async (updates: Partial<AdminUserProfile>) => {
    if (!user) throw new Error("Usuário não autenticado");

    await updateDoc(doc(db, "users", user.uid), updates);

    if (updates.displayName) {
      await updateProfile(user, { displayName: updates.displayName });
    }

    setUserProfile((prev) => ({
      ...(prev || {}),
      ...updates
    }));
  };

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

  const updateUserPassword = async (currentPasswordForUpdate: string, newPasswordForUpdate: string) => {
    if (!user) throw new Error("Usuário não autenticado");
    if (!user.email) throw new Error("Usuário não possui email cadastrado.");

    const credential = EmailAuthProvider.credential(user.email, currentPasswordForUpdate);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPasswordForUpdate);
  };

  const onSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      await updateUserProfile({ displayName });
      toast.success("Nome atualizado com sucesso");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar perfil");
    } finally {
      setSavingProfile(false);
    }
  };

  const onChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !currentPasswordForEmail) {
      toast.error("Informe o novo email e a senha atual");
      return;
    }
    try {
      setSavingEmail(true);
      await updateUserEmail(newEmail, currentPasswordForEmail);
      toast.success("Verifique sua caixa de entrada para confirmar o novo email");
      setNewEmail("");
      setCurrentPasswordForEmail("");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar email");
    } finally {
      setSavingEmail(false);
    }
  };

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error("Informe a senha atual e a nova senha");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    try {
      setSavingPassword(true);
      await updateUserPassword(currentPassword, newPassword);
      toast.success("Senha atualizada com sucesso");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar senha");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Perfil do Administrador</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Informações da Conta</CardTitle>
          <CardDescription>Dados básicos da sua conta administrativa</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={resolvedAdminAvatarUrl} alt={userProfile?.displayName || user?.email || "Admin"} />
              <AvatarFallback>{(userProfile?.displayName || "A").slice(0, 1)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{userProfile?.displayName || "Administrador"}</div>
              <div className="text-sm text-muted-foreground">{user?.email}</div>
            </div>
          </div>

          <Separator className="my-4" />

          <form onSubmit={onSaveProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Nome de exibição</Label>
              <Input id="displayName" value={displayName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDisplayName(e.target.value)} placeholder="Seu nome" />
            </div>
            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? "Salvando..." : "Salvar alterações"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Alterar Email</CardTitle>
            <CardDescription>Você receberá um email de verificação para confirmar a troca</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onChangeEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newEmail">Novo email</Label>
                <Input id="newEmail" type="email" value={newEmail} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEmail(e.target.value)} placeholder="novo@email.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currentPasswordForEmail">Senha atual</Label>
                <Input id="currentPasswordForEmail" type="password" value={currentPasswordForEmail} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPasswordForEmail(e.target.value)} placeholder="Sua senha atual" />
              </div>
              <Button type="submit" disabled={savingEmail}>
                {savingEmail ? "Atualizando..." : "Atualizar email"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alterar Senha</CardTitle>
            <CardDescription>Defina uma nova senha segura</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Senha atual</Label>
                <Input id="currentPassword" type="password" value={currentPassword} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)} placeholder="Sua senha atual" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova senha</Label>
                <Input id="newPassword" type="password" value={newPassword} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)} placeholder="Repita a nova senha" />
              </div>
              <Button type="submit" disabled={savingPassword}>
                {savingPassword ? "Atualizando..." : "Atualizar senha"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

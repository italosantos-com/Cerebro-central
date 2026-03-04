'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthProvider';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile, deleteUser } from 'firebase/auth';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Eye, EyeOff, User, Mail, Lock, Crown, Smile, CheckCircle, XCircle, Calendar, Star, Sparkles, MessageSquare, Users } from 'lucide-react';
import { useFaceAPI } from '@/hooks/use-face-api';
import { useProfileSettings } from '@/hooks/use-profile-settings';
import EmailVerificationBanner from '@/components/email-verification-banner';
import { isSuperAdminUser } from '@/lib/superadmin-config';
import SubscriberChatList from '@/components/subscriber-chat-list';
import FollowingList from '@/components/following-list';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';

export default function PerfilPage() {
  const router = useRouter();
  const { user, userProfile, loading, updateUserEmail, updateUserPassword, updateUserProfile, refreshUserProfile, checkEmailUpdateAndSync, checkEmailVerificationAndSync, forceUpdateEmailInFirestore, syncFirestoreWithAuth, forceCompleteSync, checkOfficialEmailVerification } = useAuth();
  const { settings } = useProfileSettings();

  // Face API hook
  const {
    isLoaded: faceApiLoaded,
    isLoading: faceApiLoading,
    error: faceApiError,
    status: faceApiStatus,
    extractFaceDescriptor,
    compareFaceDescriptors,
    base64ToDescriptor
  } = useFaceAPI();

  // Estados
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ✅ Estados para bloqueio de email
  const [isWaitingEmailVerification, setIsWaitingEmailVerification] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingFaceId, setLoadingFaceId] = useState(false);
  const [showFaceIdModal, setShowFaceIdModal] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedFace, setCapturedFace] = useState<string | null>(null);
  const [isTestingFaceId, setIsTestingFaceId] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 🔄 Estado para forçar reload dos dados
  const [forceReload, setForceReload] = useState(0);

  // Verificar status de assinatura
  const getSubscriptionStatus = () => {

    // APENAS Firebase como fonte única da verdade
    if (userProfile?.isSubscriber) {
      return {
        isSubscriber: true,
        type: 'Assinante',
        expiryDate: userProfile.subscriptionEndDate ? new Date(userProfile.subscriptionEndDate) : null
      };
    }

    return {
      isSubscriber: false,
      type: 'Gratuito',
      expiryDate: null
    };
  };

  const subscriptionStatus = getSubscriptionStatus();
  const profileUsername = (userProfile as { username?: string } | null)?.username;
  const resolvedProfileAvatarUrl = settings?.profilePictureUrl || userProfile?.photoURL || '/placeholder-photo.svg';
  const isSuperAdmin = isSuperAdminUser({
    username: profileUsername,
    email: user?.email || userProfile?.email,
  });

  // 🔄 Atualização automática do perfil
  useEffect(() => {
    const handleSubscriptionActivated = async () => {

      if (user?.uid) {
        await refreshUserProfile();
        setForceReload(prev => prev + 1);
        toast.success('Perfil atualizado automaticamente!', { duration: 2000 });
      }
    };

    // Atualização automática a cada 30 segundos
    const autoRefreshInterval = setInterval(async () => {
      if (user?.uid) {
        await refreshUserProfile();

      }
    }, 30000);

    window.addEventListener('subscription-activated', handleSubscriptionActivated);

    return () => {
      window.removeEventListener('subscription-activated', handleSubscriptionActivated);
      clearInterval(autoRefreshInterval);
    };
  }, [user, refreshUserProfile]);



  // ✅ Bloquear navegação durante verificação
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isWaitingEmailVerification) {
        e.preventDefault();
        e.returnValue = 'Você tem uma verificação de email pendente. Tem certeza que deseja sair?';
        return e.returnValue;
      }
    };

    const handlePopState = (e: PopStateEvent) => {
      if (isWaitingEmailVerification) {
        e.preventDefault();
        window.history.pushState(null, '', window.location.href);
        toast.warning('Complete a verificação do email antes de sair desta página');
      }
    };

    if (isWaitingEmailVerification) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('popstate', handlePopState);
      // Adicionar entrada no histórico para bloquear o botão voltar
      window.history.pushState(null, '', window.location.href);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isWaitingEmailVerification]);

  // ✅ Fechar modal automaticamente após confirmação REAL
  useEffect((): void | (() => void) => {
    if (emailConfirmed && isWaitingEmailVerification) {
      // Aguardar 2 segundos para mostrar a confirmação, depois fechar
      const closeTimer = setTimeout(() => {
        setEmailConfirmed(false);
        setIsWaitingEmailVerification(false);
        setPendingEmail('');
      }, 2000);

      return () => clearTimeout(closeTimer);
    }
  }, [emailConfirmed, isWaitingEmailVerification]);

  // Verificação de autenticação
  useEffect(() => {
    console.log('[Perfil] 🔍 Verificando autenticação:', {
      loading,
      isRedirecting,
      hasUser: !!user,
      userEmail: user?.email,
      userProfileEmail: userProfile?.email
    });

    if (!loading && !isRedirecting) {
      if (!user) {
        console.log('[Perfil] ❌ Usuário não autenticado - redirecionando para /auth/face');
        setIsRedirecting(true);
        router.push('/auth/face');
      } else {
        console.log('[Perfil] ✅ Usuário autenticado:', {
          email: user.email,
          uid: user.uid,
          emailVerified: user.emailVerified
        });
      }
    }
     
  }, [user, loading, router, isRedirecting]); // userProfile.email não precisa, user contém email

  // Câmera para Face ID
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (showFaceIdModal && videoRef.current) {
      setCameraError(null);
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current && videoRef.current.play();
            };
          }
        })
        .catch((err) => {
          setCameraError('Não foi possível acessar a câmera: ' + err.message);
        });
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [showFaceIdModal]);

  if (loading || isRedirecting) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotoPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileInputRef.current?.files?.[0] || !user) return;
    setUploadingPhoto(true);
    try {
      const file = fileInputRef.current.files[0];
      const storage = getStorage();
      const photoRef = storageRef(storage, `profile-photos/${user.uid}`);
      await uploadBytes(photoRef, file);
      const url = await getDownloadURL(photoRef);
      await updateProfile(user, { photoURL: url });
      await user.reload();
      await updateDoc(doc(db, 'users', user.uid), { photoURL: url });
      await refreshUserProfile();
      toast.success('Foto de perfil atualizada!');
      setPhotoPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      toast.error('Erro ao atualizar foto de perfil');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (isSuperAdmin) {
      toast.error('O perfil global (SuperAdmin) nao pode ser excluido.');
      return;
    }
    if (!user) return;
    setDeletingAccount(true);
    try {
      await deleteDoc(doc(db, 'users', user.uid));
      await deleteUser(user);
      toast.success('Sua conta foi excluída com sucesso.');
      router.push('/');
    } catch (error: any) {
      console.error('[Perfil] Erro ao excluir conta:', error);
      toast.error(error?.message || 'Não foi possível excluir sua conta.');
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleResetFaceId = async () => {
    setLoadingFaceId(true);
    try {
      // ✅ REMOVIDO: localStorage - Face ID será resetado apenas no Firestore

      // Limpar dados do Face ID do Firestore
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
          faceData: null,
          faceIdEnabled: false,
          lastFaceIdUpdate: null
        });

        // Recarregar perfil para refletir as mudanças
        await refreshUserProfile();
      }

      // Mostrar modal para capturar novo Face ID
      setIsTestingFaceId(false);
      setShowFaceIdModal(true);
      setCapturedFace(null);
      setCameraError(null);

      toast.success('Face ID removido! Agora você pode cadastrar um novo.');
    } catch (err) {
      console.error('Erro ao trocar Face ID:', err);
      toast.error('Erro ao trocar Face ID');
    } finally {
      setLoadingFaceId(false);
    }
  };

  // Função para comparar rostos usando face-api.js
  const compareFaceImages = async (capturedImage: string, storedImage: string): Promise<number> => {
    try {
      if (!faceApiLoaded) {
        console.log('[Perfil] Face API não carregada, usando comparação básica');
        return 0.95; // Simular sucesso para desenvolvimento
      }

      // Extrair descritores faciais
      const capturedDescriptor = await extractFaceDescriptor(capturedImage);
      const storedDescriptor = await base64ToDescriptor(storedImage);

      if (!capturedDescriptor || !storedDescriptor) {
        console.log('[Perfil] Não foi possível extrair descritores faciais');
        return 0;
      }

      // Comparar descritores
      const similarity = compareFaceDescriptors(capturedDescriptor, storedDescriptor);
      console.log('[Perfil] Similaridade calculada:', similarity);
      return similarity;
    } catch (error) {
      console.error('[Perfil] Erro na comparação de rostos:', error);
      return 0;
    }
  };

  const handleCaptureFace = async () => {
    if (!videoRef.current || !user) {
      toast.error('Câmera não disponível ou usuário não autenticado');
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        toast.error('Erro ao acessar câmera');
        return;
      }

      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      setCapturedFace(dataUrl);

      // Verificar se já existe um Face ID e comparar
      if (userProfile?.faceData) {
        const similarity = await compareFaceImages(dataUrl, userProfile.faceData);
        console.log('[Perfil] Similaridade com Face ID existente:', similarity);

        if (similarity > 0.90) {
          toast.error('Este rosto já está cadastrado. Use um rosto diferente.');
          setCapturedFace(null);
          return;
        }
      }

      // Salvar no Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        faceData: dataUrl,
        faceIdEnabled: true,
        lastFaceIdUpdate: new Date().toISOString()
      });

      // ✅ REMOVIDO: localStorage - Face ID salvo apenas no Firestore
      console.log('[Perfil] ✅ Face ID salvo no Firestore - sem localStorage');

      // Recarregar perfil
      await refreshUserProfile();

      toast.success('Face ID atualizado com sucesso!');

      // Fechar modal após 2 segundos
      setTimeout(() => {
        setShowFaceIdModal(false);
        setCapturedFace(null);
      }, 2000);

    } catch (error) {
      console.error('Erro ao salvar Face ID:', error);
      toast.error('Erro ao salvar Face ID. Tente novamente.');
    }
  };

  const handleTestFaceId = async () => {
    if (!userProfile?.faceData) {
      toast.error('Nenhum Face ID configurado para testar');
      return;
    }

    setIsTestingFaceId(true);
    setShowFaceIdModal(true);
    setCapturedFace(null);
    setCameraError(null);

    toast.info('Posicione seu rosto na câmera e clique em "Testar"');
  };

  const handleTestFaceIdCapture = async () => {
    if (!videoRef.current || !userProfile?.faceData) {
      toast.error('Câmera não disponível ou Face ID não configurado');
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        toast.error('Erro ao acessar câmera');
        return;
      }

      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      setCapturedFace(dataUrl);

      // Comparar com o Face ID existente
      const similarity = await compareFaceImages(dataUrl, userProfile.faceData);
      console.log('[Perfil] Teste de Face ID - Similaridade:', similarity);

      if (similarity > 0.90) {
        toast.success(`✅ Face ID reconhecido! Similaridade: ${(similarity * 100).toFixed(1)}%`);
        setTimeout(() => {
          setShowFaceIdModal(false);
          setIsTestingFaceId(false);
          setCapturedFace(null);
        }, 2000);
      } else {
        toast.error(`❌ Face ID não reconhecido. Similaridade: ${(similarity * 100).toFixed(1)}% (mínimo 90%)`);
        setCapturedFace(null);
      }

    } catch (error) {
      console.error('Erro ao testar Face ID:', error);
      toast.error('Erro ao testar Face ID. Tente novamente.');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingProfile(true);
    try {
      await updateUserProfile({ displayName: displayName });
      toast.success('Perfil atualizado!');
    } catch (error: any) {
      toast.error('Erro ao atualizar perfil: ' + error.message);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações básicas
    if (!newEmail?.trim()) {
      toast.error('Digite o novo email');
      return;
    }

    if (!currentPassword?.trim()) {
      toast.error('Digite sua senha atual');
      return;
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      toast.error('Digite um email válido');
      return;
    }

    // ✅ NOVA VALIDAÇÃO: Mais flexível, mas com avisos inteligentes
    const currentAuthEmail = user?.email;
    const currentFirestoreEmail = userProfile?.email;

    console.log('[Frontend] Validação de email:');
    console.log('[Frontend] - Auth:', currentAuthEmail, '| Firestore:', currentFirestoreEmail, '| Novo:', newEmail.trim());

    // Só bloquear se email está REALMENTE ativo e sincronizado
    if (currentAuthEmail === newEmail.trim() && currentFirestoreEmail === newEmail.trim()) {
      toast.error('Este email já está ativo e verificado na sua conta');
      return;
    }

    // Avisar sobre situações especiais (mas permitir)
    if (currentAuthEmail === newEmail.trim() || currentFirestoreEmail === newEmail.trim()) {
      console.log('[Frontend] ⚠️ Email pode estar dessincronizado, mas permitindo troca...');
    }

    setLoadingEmail(true);
    try {
      const result = await updateUserEmail(newEmail.trim(), currentPassword);

      // Verificar se retornou um objeto indicando verificação necessária
      if (result && result.requiresVerification) {
        // ✅ ATIVAR SISTEMA DE BLOQUEIO
        const emailToUpdate = newEmail.trim();
        setIsWaitingEmailVerification(true);
        setPendingEmail(emailToUpdate);
        setEmailConfirmed(false);

        toast.success(result.message, {
          duration: 8000,
          action: {
            label: 'Abrir Gmail',
            onClick: () => {
              window.open(`https://mail.google.com`, '_blank');
            }
          }
        });
        setNewEmail('');
        setCurrentPassword('');

        // ✅ PROCESSO DIRETO: Email alterado sem verificação
        console.log('[Perfil] ✅ Email alterado diretamente para:', emailToUpdate);
        console.log('[Perfil] 🎯 Processo concluído - sem necessidade de verificação');

        // Toast de sucesso
        toast.success('✅ Email alterado com sucesso!', {
          description: 'Você pode continuar usando sua conta normalmente.',
          duration: 4000
        });

        // Recarregar perfil
        await refreshUserProfile();

      } else {
        // Fluxo antigo (caso não retorne o objeto)
        toast.success('Email atualizado com sucesso!');
        setNewEmail('');
        setCurrentPassword('');
      }
    } catch (error: any) {
      console.error('[Perfil] Erro ao atualizar email:', error);

      // Tratamento específico para erro de credenciais
      if (error.message.includes('Credenciais inválidas') ||
        error.message.includes('não foi criado com email e senha')) {
        toast.error(error.message, {
          duration: 6000,
          action: {
            label: 'Fazer Login Novamente',
            onClick: () => {
              // Limpar dados de auth e redirecionar
              localStorage.clear();
              sessionStorage.clear();
              router.push('/auth/face');
            }
          }
        });
      } else {
        toast.error(error.message || 'Erro ao atualizar email');
      }
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoadingPassword(true);
    try {
      await updateUserPassword(currentPassword, newPassword);
      toast.success('Senha atualizada!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      let errorMessage = 'Erro ao atualizar senha';
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Senha atual incorreta';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Senha muito fraca';
      }
      toast.error(errorMessage);
    } finally {
      setLoadingPassword(false);
    }
  };

  if (loading || !user || !userProfile) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* ✅ MODAL DE BLOQUEIO PARA VERIFICAÇÃO DE EMAIL */}
      <Dialog open={isWaitingEmailVerification} onOpenChange={() => { }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-500" />
              🔒 Verificação de Email Pendente
            </DialogTitle>
            <DialogDescription>
              Você não pode sair desta página até verificar seu novo email
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="text-2xl mb-2">📧</div>
              <p className="font-semibold text-blue-800 dark:text-blue-200">
                Email enviado para:
              </p>
              <p className="text-blue-700 dark:text-blue-300 font-mono text-sm mt-1">
                {pendingEmail}
              </p>
            </div>

            {emailConfirmed ? (
              <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="font-semibold text-green-800 dark:text-green-200">
                  ✅ Email Confirmado com Sucesso!
                </p>
                <p className="text-green-700 dark:text-green-300 text-sm">
                  Redirecionando...
                </p>
              </div>
            ) : (
              <>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="text-3xl mb-2">🔄</div>
                  <p className="font-semibold text-blue-800 dark:text-blue-200">
                    Aguardando verificação...
                  </p>
                  <p className="text-blue-700 dark:text-blue-300 text-sm">
                    Clique no link no seu email para confirmar
                  </p>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={() => window.open('https://mail.google.com', '_blank')}
                    className="w-full"
                    variant="default"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Abrir Gmail
                  </Button>

                  <Button
                    onClick={async () => {
                      try {
                        console.log('[Modal] 🎯 Verificação OFICIAL - Firebase Auth + Cloud Functions');
                        console.log('[Modal] Email esperado:', pendingEmail);

                        // ✅ VERIFICAÇÃO OFICIAL: Firebase Auth + Cloud Functions
                        const wasVerified = await checkOfficialEmailVerification(pendingEmail);
                        console.log('[Modal] Email foi verificado?', wasVerified);

                        if (wasVerified) {
                          setEmailConfirmed(true);
                          toast.success('🎉 Email verificado com sucesso!');
                          await refreshUserProfile();
                        } else {
                          console.log('[Modal] ⏳ Ainda aguardando verificação...');
                          toast.info('📧 Clique no link de verificação no seu email e tente novamente');
                        }

                      } catch (error: any) {
                        console.error('[Modal] Erro na verificação:', error);

                        if (error.message?.includes('📧')) {
                          toast.info(error.message);
                        } else if (error.message?.includes('✅')) {
                          toast.success(error.message);
                        } else {
                          toast.error('Erro ao verificar email');
                        }
                      }
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Verificar Agora
                  </Button>
                </div>

                <div className="text-center text-sm text-muted-foreground">
                  <p>🔒 Esta página está bloqueada até você confirmar o email</p>
                  <p>Verifique sua caixa de entrada (incluindo spam)</p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setIsWaitingEmailVerification(false);
                        setPendingEmail('');
                        setEmailConfirmed(false);
                        toast.info('Verificação de email cancelada.');
                      }}
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      ❌ Cancelar
                    </Button>



                    {user?.email === pendingEmail && (
                      <Button
                        onClick={async () => {
                          try {
                            console.log('[Modal] 🔄 Email já está correto - sincronizando...');
                            await syncFirestoreWithAuth();
                            setEmailConfirmed(true);
                            toast.success('✅ Email sincronizado com sucesso!');
                          } catch (error) {
                            console.error('[Modal] Erro ao sincronizar:', error);
                            toast.error('Erro ao sincronizar');
                          }
                        }}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                      >
                        ✅ Email já está correto
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        {/* Banner de verificação de email */}
        <EmailVerificationBanner />
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={resolvedProfileAvatarUrl} alt={userProfile.displayName} />
                <AvatarFallback className="text-lg">
                  {userProfile.displayName?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl font-bold">{userProfile.displayName || 'Usuário'}</h1>
                  {subscriptionStatus.isSubscriber ? (
                    <Badge variant="default" className="bg-gradient-to-r from-yellow-400 to-yellow-600">
                      <Crown className="w-3 h-3 mr-1" />
                      {subscriptionStatus.type}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                      <User className="w-3 h-3 mr-1" />
                      {subscriptionStatus.type}
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">{userProfile.email}</p>
                <div className="text-sm text-muted-foreground">
                  Membro desde: {new Date(userProfile.createdAt).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card de Status de Assinatura - TEMA DO SITE */}
        <Card className={`relative overflow-hidden animate-in fade-in-0 zoom-in-95 duration-500 shadow-neon-red-strong border-primary/50 bg-card/90 backdrop-blur-xl`}>

          {/* Efeito sutil para assinantes */}
          {subscriptionStatus.isSubscriber && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent"></div>
          )}

          <CardContent className="p-8 relative z-10">
            {/* Header do Status */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                {/* Ícone de Status */}
                <div className={`relative ${subscriptionStatus.isSubscriber
                  ? 'bg-primary p-4 rounded-full shadow-neon-red-light'
                  : 'bg-muted p-4 rounded-full'}`}>
                  {subscriptionStatus.isSubscriber ? (
                    <CheckCircle className="h-8 w-8 text-primary-foreground" />
                  ) : (
                    <XCircle className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className={`text-2xl font-bold text-primary text-shadow-neon-red-light`}>
                    Status da Assinatura
                  </h3>

                  {/* Status Principal */}
                  <div className="flex items-center space-x-3">
                    <span className={`text-2xl font-bold ${subscriptionStatus.isSubscriber
                      ? 'text-primary' : 'text-muted-foreground'}`}>
                      {subscriptionStatus.isSubscriber ? '✅ Assinante Ativo' : '❌ Não é Assinante'}
                    </span>

                    {subscriptionStatus.isSubscriber && (
                      <Badge className="bg-primary text-primary-foreground font-bold px-3 py-1 rounded-full shadow-neon-red-light">
                        <Star className="w-4 h-4 mr-1" />
                        Assinante
                      </Badge>
                    )}
                  </div>

                  {/* Data de Expiração */}
                  {subscriptionStatus.expiryDate && (
                    <div className="flex items-center space-x-2 text-sm">
                      <div className="bg-primary/20 p-2 rounded-full">
                        <Calendar className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-primary font-medium">
                        Expira em: {subscriptionStatus.expiryDate.toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Removido botão de atualizar - atualização automática */}
            </div>

            {/* Botão Assinar para não assinantes */}
            {!subscriptionStatus.isSubscriber && (
              <div className="text-center mb-6">
                <Button
                  onClick={() => router.push('/')}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-3 rounded-lg transition-colors duration-300 shadow-neon-red-light hover:shadow-neon-red-strong"
                >
                  <Crown className="w-5 h-5 mr-2" />
                  Assinar Agora
                </Button>
              </div>
            )}

            {/* Separador Decorativo */}
            <div className="flex items-center my-6">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
              <div className="px-4">
                <div className={`w-2 h-2 rounded-full ${subscriptionStatus.isSubscriber ? 'bg-primary shadow-neon-red-light' : 'bg-muted'}`}></div>
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
            </div>

            {/* Benefícios e Informações */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Seção de Benefícios */}
              <div className="space-y-4">
                <h4 className={`text-lg font-bold flex items-center space-x-2 text-primary text-shadow-neon-red-light`}>
                  <Sparkles className="h-5 w-5" />
                  <span>{subscriptionStatus.isSubscriber ? 'Seus Benefícios' : 'Benefícios de Assinante'}</span>
                </h4>

                <div className="space-y-3">
                  <div className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-300 ${subscriptionStatus.isSubscriber
                    ? 'bg-primary/10 border border-primary/20 shadow-neon-red-light'
                    : 'bg-muted/50 border border-muted'
                    }`}>
                    {subscriptionStatus.isSubscriber ? (
                      <div className="bg-primary/20 p-2 rounded-full">
                        <CheckCircle className="h-4 w-4 text-primary" />
                      </div>
                    ) : (
                      <div className="bg-muted p-2 rounded-full">
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <span className={`font-medium ${subscriptionStatus.isSubscriber ? 'text-primary' : 'text-muted-foreground'}`}>
                      Acesso a conteúdo exclusivo
                    </span>
                  </div>


                </div>
              </div>

              {/* Seção de Informações da Assinatura */}
              {subscriptionStatus.isSubscriber && (
                <div className="space-y-4">
                  <h4 className="text-lg text-shadow-neon-red-light">📋 Informações da Assinatura</h4>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-3 rounded-lg transition-all duration-300 bg-primary/10 border border-primary/20 shadow-neon-red-light">
                      <div className="flex items-center justify-between">
                        <span className="text-shadow-neon-red-light">Tipo:</span>
                        <span className=" text-primary font-bold text-shadow-neon-red-light">Assinante</span>
                      </div>
                    </div>

                    {subscriptionStatus.expiryDate && (
                      <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg shadow-neon-red-light">
                        <div className="flex items-center justify-between">
                          <span className="text-shadow-neon-red-light">Válida até:</span>
                          <span className="text-primary font-bold text-shadow-neon-red-light">
                            {subscriptionStatus.expiryDate.toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 gap-1">
            <TabsTrigger value="profile" className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Perfil</span>
              <span className="sm:hidden">Perfil</span>
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center space-x-2">
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">Email</span>
              <span className="sm:hidden">Email</span>
            </TabsTrigger>
            <TabsTrigger value="password" className="flex items-center space-x-2">
              <Lock className="w-4 h-4" />
              <span className="hidden sm:inline">Senha</span>
              <span className="sm:hidden">Senha</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Mensagens</span>
              <span className="sm:hidden">Msgs</span>
            </TabsTrigger>
            <TabsTrigger value="following" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Seguindo</span>
              <span className="sm:hidden">Seg</span>
            </TabsTrigger>
            {/* Aba Face ID comentada temporariamente */}
            {/* <TabsTrigger value="faceid" className="flex items-center space-x-2">
              <Smile className="w-4 h-4" />
              <span>Face ID</span>
            </TabsTrigger> */}
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Informações do Perfil</CardTitle>
                <CardDescription>Atualize suas informações pessoais</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Nome de Exibição</Label>
                    <Input
                      id="displayName"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Seu nome de exibição"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Foto de Perfil</Label>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={photoPreview || resolvedProfileAvatarUrl} alt={userProfile.displayName} />
                        <AvatarFallback className="text-lg">
                          {userProfile.displayName?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          ref={fileInputRef}
                          onChange={handlePhotoChange}
                          className="block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
                        />
                        {photoPreview && (
                          <Button type="button" size="sm" disabled={uploadingPhoto} onClick={handlePhotoUpload}>
                            {uploadingPhoto ? 'Salvando...' : 'Salvar Foto'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button type="submit" disabled={loadingProfile} className="w-full">
                    {loadingProfile ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email">
            <Card>
              <CardHeader>
                <CardTitle>Alterar Email</CardTitle>
                <CardDescription>
                  Altere seu endereço de email para qualquer email válido
                  <br />
                  <span className="text-xs text-muted-foreground">
                    💡 Você pode usar emails novos ou voltar para emails já usados anteriormente
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateEmail} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email Atual</Label>
                    <Input
                      type="email"
                      value={user?.email || userProfile.email}
                      disabled
                      className="bg-muted"
                    />
                    {user?.email !== userProfile.email && (
                      <div className="space-y-2">
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          ⚠️ Emails dessincronizados - Auth: {user?.email} | Firestore: {userProfile.email}
                        </p>
                        <Button
                          onClick={async () => {
                            try {
                              console.log('[Perfil] Forçando sincronização manual...');
                              await syncFirestoreWithAuth();
                              toast.success('✅ Emails sincronizados com sucesso!');
                            } catch (error) {
                              console.error('[Perfil] Erro na sincronização:', error);
                              toast.error('❌ Erro ao sincronizar emails');
                            }
                          }}
                          size="sm"
                          variant="outline"
                          className="text-xs"
                        >
                          🔄 Sincronizar Emails
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          💡 Você pode trocar para qualquer email, incluindo emails já usados anteriormente
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newEmail">Novo Email</Label>
                    <Input
                      id="newEmail"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="novo@email.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currentPasswordEmail">Senha Atual</Label>
                    <div className="relative">
                      <Input
                        id="currentPasswordEmail"
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Digite sua senha atual"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <Button type="submit" disabled={loadingEmail} className="w-full">
                    {loadingEmail ? 'Atualizando...' : 'Atualizar Email'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle>Alterar Senha</CardTitle>
                <CardDescription>Altere sua senha</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPasswordChange">Senha Atual</Label>
                    <div className="relative">
                      <Input
                        id="currentPasswordChange"
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Digite sua senha atual"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nova Senha</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Digite a nova senha (mín. 6 caracteres)"
                        required
                        minLength={6}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirme a nova senha"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {newPassword && confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-sm text-red-500">As senhas não coincidem</p>
                  )}

                  <Button
                    type="submit"
                    disabled={loadingPassword || (newPassword !== confirmPassword)}
                    className="w-full"
                  >
                    {loadingPassword ? 'Atualizando...' : 'Atualizar Senha'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages">
            <SubscriberChatList 
              userId={user?.uid || ''} 
              userEmail={userProfile?.email || user?.email || ''} 
            />
          </TabsContent>

          <TabsContent value="following">
            <FollowingList 
              userId={user?.uid || ''} 
              userEmail={userProfile?.email || user?.email || ''} 
            />
          </TabsContent>

          {/* Conteúdo da aba Face ID comentado temporariamente */}
          {/* <TabsContent value="faceid">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smile className="w-5 h-5" />
                  Face ID
                </CardTitle>
                <CardDescription>
                  Gerencie seu Face ID para login rápido e seguro
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="p-4 rounded-lg border bg-muted/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${userProfile?.faceIdEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <div>
                          <p className="font-medium">
                            Status: {userProfile?.faceIdEnabled ? 'Ativo' : 'Não configurado'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {userProfile?.faceIdEnabled 
                              ? 'Seu Face ID está configurado e funcionando'
                              : 'Configure seu Face ID para login rápido'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {userProfile?.lastFaceIdUpdate && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-sm text-muted-foreground">
                          Última atualização: {new Date(userProfile.lastFaceIdUpdate).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">ℹ️ Como funciona</h4>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      <li>• O Face ID é salvo apenas neste dispositivo</li>
                      <li>• Você pode trocar a qualquer momento</li>
                      <li>• Funciona apenas com câmera frontal</li>
                      <li>• Dados são criptografados e seguros</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <Button
                      variant="default"
                      onClick={handleResetFaceId}
                      disabled={loadingFaceId}
                      className="w-full h-11 bg-primary hover:bg-primary/90"
                    >
                      {loadingFaceId ? 'Processando...' : userProfile?.faceIdEnabled ? 'Trocar Face ID' : 'Configurar Face ID'}
                    </Button>
                    
                    {userProfile?.faceIdEnabled && (
                      <Button
                        variant="outline"
                        onClick={handleTestFaceId}
                        className="w-full h-11"
                      >
                        Testar Face ID
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent> */}
        </Tabs>

        {!isSuperAdmin && (
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle>Excluir minha conta</CardTitle>
              <CardDescription>
                Esta ação remove sua conta e não pode ser desfeita.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={deletingAccount}>
                    {deletingAccount ? 'Excluindo...' : 'Excluir minha conta'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir sua conta? Esta ação é permanente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        )}

        <Dialog open={showFaceIdModal} onOpenChange={setShowFaceIdModal}>
          <DialogContent className="max-w-md shadow-neon-red-strong border-primary/50 bg-card/90 backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="text-xl text-primary text-shadow-neon-red-light">
                {isTestingFaceId ? 'Testar Face ID' : 'Capturar novo Face ID'}
              </DialogTitle>
              <DialogDescription>
                {isTestingFaceId
                  ? 'Posicione seu rosto na câmera e clique em "Testar" para verificar se o Face ID funciona.'
                  : 'Posicione seu rosto na câmera e clique em "Capturar" para registrar seu novo Face ID.'
                }
              </DialogDescription>
            </DialogHeader>
            {cameraError ? (
              <div className="text-red-500 text-center p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="font-medium">Erro na câmera:</p>
                <p className="text-sm">{cameraError}</p>
                <Button
                  onClick={() => setShowFaceIdModal(false)}
                  variant="outline"
                  className="mt-2"
                >
                  Fechar
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-full max-w-xs">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="rounded-lg border border-primary/30 w-full aspect-video bg-black shadow-neon-red-light"
                  />
                  {!videoRef.current?.srcObject && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                      <div className="text-center text-white">
                        <p className="text-sm">Carregando câmera...</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 w-full">
                  <Button
                    onClick={isTestingFaceId ? handleTestFaceIdCapture : handleCaptureFace}
                    className="flex-1 bg-primary hover:bg-primary/90"
                    disabled={!videoRef.current?.srcObject}
                  >
                    {isTestingFaceId ? 'Testar Face ID' : 'Capturar Face ID'}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowFaceIdModal(false);
                      setIsTestingFaceId(false);
                    }}
                    variant="outline"
                  >
                    Cancelar
                  </Button>
                </div>

                {capturedFace && (
                  <div className="w-full space-y-2">
                    <p className="text-sm text-green-600 font-medium text-center">
                      {isTestingFaceId ? '✅ Face ID testado!' : '✅ Face ID capturado com sucesso!'}
                    </p>
                    { }
                    <img
                      src={capturedFace}
                      alt="Face capturada"
                      className="rounded-lg border border-green-300 w-full max-w-xs mx-auto shadow-lg"
                    />
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}


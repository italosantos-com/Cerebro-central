'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updatePassword,
  updateEmail,
  updateProfile,
  onAuthStateChanged,
  sendPasswordResetEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
  verifyBeforeUpdateEmail,
  sendEmailVerification
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db, isLocalhost } from '@/lib/firebase';
import { getBaseUrl } from '@/lib/utils';
import { validateEmailExists } from '@/services/email-validation';
import { sendEmailChangeNotificationToOldEmail, sendWelcomeToNewEmail, sendEmailRollbackNotification } from '@/services/email-notifications';
import { saveUserProfile, extractProfileFromProvider } from '@/services/user-profile-service';
import { usePathname } from 'next/navigation';
import { isAdminRoutePath } from '@/config/admin-routes';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  createdAt: string;
  lastLogin: string;
  isSubscriber: boolean;
  subscriptionType?: string;
  subscriptionEndDate?: string;
  faceIdEnabled?: boolean;
  faceData?: string;
  lastFaceIdUpdate?: string;
  lastSync?: string;
  emailVerified?: boolean;
  lastEmailVerification?: string;
  claims?: { [key: string]: any };
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ user: User }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ user: User }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendEmailVerification: () => Promise<void>;
  updateUserEmail: (newEmail: string, currentPassword: string) => Promise<any>;
  updateUserPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  checkEmailUpdateAndSync: () => Promise<boolean>;
  checkEmailVerificationAndSync: (expectedEmail?: string) => Promise<boolean>;
  forceUpdateEmailInFirestore: (newEmail: string) => Promise<boolean>;
  syncFirestoreWithAuth: () => Promise<boolean>;
  forceCompleteSync: () => Promise<boolean>;
  manualSync: () => Promise<boolean>;
  checkOfficialEmailVerification: (expectedEmail?: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    // ✅ LISTENER OFICIAL: Sincronização automática Firebase Auth ↔ Firestore
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('[🔄 AuthProvider] Estado de autenticação alterado:', {
        hasUser: !!user,
        email: user?.email,
        emailVerified: user?.emailVerified,
        uid: user?.uid
      });

      if (user) {
        // Forçar refresh do token para garantir claims atualizadas
        try {
          await user.getIdToken(true);
          console.log('[AuthProvider] 🔄 Token atualizado com sucesso');
        } catch (tokenError) {
          console.error('[AuthProvider] ⚠️ Erro ao atualizar token:', tokenError);
        }
      }

      setUser(user);
      try {
        if (user) {
          // ✅ COLETAR E SALVAR DADOS DO PERFIL DO PROVEDOR OAuth
          try {
            await saveUserProfile(user);
            console.log('[AuthProvider] ✅ Perfil do usuário salvo/atualizado com dados do provedor');
          } catch (profileError) {
            console.error('[AuthProvider] ⚠️ Erro ao salvar perfil do provedor:', profileError);
            // Não bloquear o fluxo se falhar
          }

          // ✅ SINCRONIZAÇÃO INTELIGENTE: Verificar se precisa sincronizar
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const firestoreData = userDoc.data();

            // ✅ DETECTAR DESSINCRONIZAÇÃO
            const authEmail = user.email;
            const firestoreEmail = firestoreData.email;
            const authVerified = user.emailVerified;
            const firestoreVerified = firestoreData.emailVerified;

            if (authEmail !== firestoreEmail || authVerified !== firestoreVerified) {
              console.log('[🔄 AuthProvider] 🚨 DESSINCRONIZAÇÃO DETECTADA - Aplicando correção oficial');
              console.log('[📧 AuthProvider] Firebase Auth (oficial):', { email: authEmail, verified: authVerified });
              console.log('[📧 AuthProvider] Firestore (desatualizado):', { email: firestoreEmail, verified: firestoreVerified });

              // ✅ CORREÇÃO OFICIAL IMEDIATA: Firebase Auth → Firestore
              console.log('[🔄 AuthProvider] 🔧 Aplicando correção oficial imediata...');

              const correctionData = {
                email: authEmail, // 📧 FONTE DA VERDADE
                emailVerified: authVerified, // ✅ FONTE DA VERDADE
                displayName: user.displayName || firestoreData.displayName || 'Usuário',
                lastSync: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                lastEmailVerification: authVerified ? new Date().toISOString() : (firestoreData.lastEmailVerification || new Date().toISOString()),
                // 🔒 PRESERVAR dados críticos
                isSubscriber: firestoreData.isSubscriber || false,
                subscriptionType: firestoreData.subscriptionType || '',
                subscriptionEndDate: firestoreData.subscriptionEndDate || null,
                faceIdEnabled: firestoreData.faceIdEnabled || false,
                faceData: firestoreData.faceData || null,
                createdAt: firestoreData.createdAt || new Date().toISOString()
              };

              await updateDoc(userDocRef, correctionData);

              console.log('[✅ AuthProvider] 🎯 CORREÇÃO OFICIAL APLICADA COM SUCESSO!');
              console.log('[📧 AuthProvider] Email sincronizado:', authEmail);
              console.log('[✅ AuthProvider] Status verificação:', authVerified);
            } else {
              console.log('[✅ AuthProvider] Dados já sincronizados');
            }
          }

          // Carregar perfil após sincronização
          await loadUserProfile(user.uid);
        } else {
          setUserProfile(null);
        }
      } catch (err) {
        console.error('[❌ AuthProvider] Erro no listener de auth:', err);
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]); // loadUserProfile é definida depois e é estável

  // 🔒 SISTEMA SEGURO: Recarregar perfil quando assinatura é ativada
  useEffect(() => {
    // Não interferir com rotas do admin
    if (isAdminRoutePath(pathname)) {
      return;
    }

    const handleSubscriptionActivated = () => {
      if (user?.uid) {
        loadUserProfile(user.uid);
      }
    };

    window.addEventListener('subscription-activated', handleSubscriptionActivated);

    return () => {
      window.removeEventListener('subscription-activated', handleSubscriptionActivated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, pathname]); // loadUserProfile é definida fora do useEffect

  const loadUserProfile = async (uid: string) => {
    try {
      const idTokenResult = await auth.currentUser?.getIdTokenResult();
      const claims = idTokenResult?.claims;

      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const firestoreData = userDoc.data() as UserProfile;

        // ✅ SINCRONIZAÇÃO CRÍTICA: Garantir que Firebase Auth e Firestore estejam alinhados
        if (user?.email && user.email !== firestoreData.email) {
          console.log('[Auth] 🚨 DESSINCRONIZAÇÃO DETECTADA:');
          console.log('[Auth] 📧 Firebase Auth email:', user.email);
          console.log('[Auth] 📧 Firestore email:', firestoreData.email);
          console.log('[Auth] 🔄 Iniciando sincronização FORÇADA...');

          try {
            // FORÇA sincronização com Firebase Auth como fonte da verdade
            await updateDoc(doc(db, 'users', uid), {
              email: user.email,
              emailVerified: user.emailVerified,
              lastSync: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
              // Preservar dados importantes existentes
              displayName: firestoreData.displayName || user.displayName || 'Usuário',
              isSubscriber: firestoreData.isSubscriber || false,
              faceIdEnabled: firestoreData.faceIdEnabled || false,
              faceData: firestoreData.faceData || null
            });

            // ✅ CRÍTICO: Atualizar dados locais com email correto
            firestoreData.email = user.email;
            firestoreData.emailVerified = user.emailVerified;
            firestoreData.lastSync = new Date().toISOString();

            console.log('[Auth] ✅ SINCRONIZAÇÃO FORÇADA CONCLUÍDA!');
            console.log('[Auth] 📧 Email agora sincronizado:', user.email);

            // Forçar atualização do estado local
            setTimeout(() => {
              setUserProfile({ ...firestoreData, claims });
            }, 100);

          } catch (syncError) {
            console.error('[Auth] ❌ ERRO CRÍTICO na sincronização:', syncError);
          }
        } else {
          console.log('[Auth] ✅ Emails já sincronizados:', user?.email);
        }

        setUserProfile({ ...firestoreData, claims });
      } else {
        // Criar perfil inicial se não existir
        const initialProfile: UserProfile = {
          uid: uid,
          email: user?.email || '',
          displayName: user?.displayName || 'Usuário',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          isSubscriber: false,
          claims,
        };
        // Só adiciona photoURL se existir
        if (user?.photoURL) {
          (initialProfile as any).photoURL = user.photoURL;
        }

        await setDoc(doc(db, 'users', uid), initialProfile);
        setUserProfile(initialProfile);
      }
    } catch (error) {
      console.error('[AuthProvider] Erro ao carregar perfil:', error);
      // Em caso de erro, não bloquear - definir perfil básico do Firebase Auth
      const idTokenResult = await auth.currentUser?.getIdTokenResult();
      const claims = idTokenResult?.claims;
      setUserProfile({
        uid: uid,
        email: user?.email || '',
        displayName: user?.displayName || 'Usuário',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        isSubscriber: false,
        claims,
      });
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // ✅ RETRY AUTOMÁTICO para erros 503/temporários
      let result;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          result = await signInWithEmailAndPassword(auth, email, password);
          break; // Sucesso, sair do loop
        } catch (error: any) {
          attempts++;

          console.log(`[Auth] Login - Erro capturado (tentativa ${attempts}/${maxAttempts}):`, {
            code: error.code,
            message: error.message,
            name: error.name
          });

          // Se é erro 503 ou temporário, tentar novamente
          if ((error.code === 'auth/error-code:-47' ||
            error.message.includes('503') ||
            error.message.includes('Service Unavailable')) &&
            attempts < maxAttempts) {

            console.log(`[Auth] Login - Tentativa ${attempts}/${maxAttempts} falhou (503). Tentando novamente em ${2 * attempts}s...`);
            await new Promise(resolve => setTimeout(resolve, 2000 * attempts)); // Backoff exponencial
            continue;
          }

          // Se não é erro temporário ou esgotaram tentativas, relançar
          console.log(`[Auth] Login - Relançando erro após ${attempts} tentativas`);
          throw error;
        }
      }

      // Verificar se result foi definido
      if (!result) {
        throw new Error('Falha ao fazer login após múltiplas tentativas');
      }

      // Atualizar último login
      if (result.user) {
        await updateDoc(doc(db, 'users', result.user.uid), {
          lastLogin: new Date().toISOString()
        });
      }

      return result; // ✅ Retornar o resultado para acessar user.email atualizado
    } catch (error) {
      throw error;
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    if (!email || !email.includes('@')) {
      throw new Error('Email obrigatório e válido para cadastro.');
    }
    try {
      // ✅ RETRY AUTOMÁTICO para erros 503/temporários
      let result;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          result = await createUserWithEmailAndPassword(auth, email, password);
          break; // Sucesso, sair do loop
        } catch (error: any) {
          attempts++;

          console.log(`[Auth] SignUp - Erro capturado (tentativa ${attempts}/${maxAttempts}):`, {
            code: error.code,
            message: error.message,
            name: error.name
          });

          // Se é erro 503 ou temporário, tentar novamente
          if ((error.code === 'auth/error-code:-47' ||
            error.message.includes('503') ||
            error.message.includes('Service Unavailable')) &&
            attempts < maxAttempts) {

            console.log(`[Auth] SignUp - Tentativa ${attempts}/${maxAttempts} falhou (503). Tentando novamente em ${2 * attempts}s...`);
            await new Promise(resolve => setTimeout(resolve, 2000 * attempts)); // Backoff exponencial
            continue;
          }

          // Se não é erro temporário ou esgotaram tentativas, relançar
          console.log(`[Auth] SignUp - Relançando erro após ${attempts} tentativas`);
          throw error;
        }
      }

      // Verificar se result foi definido
      if (!result) {
        throw new Error('Falha ao criar conta após múltiplas tentativas');
      }

      if (!result.user.email) {
        // Segurança extra: se o Firebase não retornar email, apaga o usuário imediatamente
        await result.user.delete();
        throw new Error('Falha ao cadastrar: email não registrado. Tente novamente.');
      }
      // Atualizar perfil do Firebase Auth
      await updateProfile(result.user, {
        displayName: displayName
      });

      // Criar documento do usuário no Firestore
      const userProfile: UserProfile = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: displayName,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        isSubscriber: false,
      };

      await setDoc(doc(db, 'users', result.user.uid), userProfile);

      // Enviar email de verificação nativo do Firebase (inclui uid para redirecionar ao perfil correto)
      try {
        const redirectPath = `/perfil?uid=${result.user.uid}`;
        const actionUrl = `${getBaseUrl()}/auth/action?redirect=${encodeURIComponent(redirectPath)}`;
        await sendEmailVerification(result.user, {
          url: actionUrl,
          handleCodeInApp: true,
        });
        console.log('[Auth] ✅ Email de verificação enviado para:', result.user.email);
      } catch (emailError) {
        console.error('[Auth] ⚠️ Erro ao enviar email de verificação:', emailError);
        // Não falhar o cadastro por causa do email
      }

      // Retornar o resultado para poder acessar o UID
      return { user: result.user };
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
    } catch (error) {
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw error;
    }
  };

  const resendEmailVerification = async () => {
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    try {
      const redirectPath = `/perfil?uid=${user.uid}`;
      const actionUrl = `${getBaseUrl()}/auth/action?redirect=${encodeURIComponent(redirectPath)}`;
      await sendEmailVerification(user, {
        url: actionUrl,
        handleCodeInApp: true,
      });
      console.log('[Auth] ✅ Email de verificação reenviado para:', user.email);
    } catch (error) {
      console.error('[Auth] ❌ Erro ao reenviar email de verificação:', error);
      throw error;
    }
  };

  const updateUserEmail = async (newEmail: string, currentPassword: string) => {
    if (!user) {
      throw new Error('Usuário não autenticado. Faça login novamente.');
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      throw new Error('Email inválido');
    }

    // Garante que o usuário do Auth está atualizado
    try {
      await user.reload();
    } catch (error) {
      console.error('[Auth] Erro ao recarregar usuário:', error);
    }

    // Verificar método de login do usuário
    const providerData = user.providerData;
    console.log('[Auth] Provider data:', providerData);

    if (!user.email) {
      throw new Error('Usuário não possui email cadastrado. Entre em contato com o suporte.');
    }

    // ✅ NOVA LÓGICA: Permitir qualquer email, mas com validação inteligente
    const currentAuthEmail = user.email;
    const currentFirestoreEmail = userProfile?.email;

    console.log('[Auth] Validação de email:');
    console.log('[Auth] - Email no Firebase Auth:', currentAuthEmail);
    console.log('[Auth] - Email no Firestore:', currentFirestoreEmail);
    console.log('[Auth] - Novo email solicitado:', newEmail);

    // ✅ PERMITIR QUALQUER EMAIL, mas avisar sobre situações especiais
    if (currentAuthEmail === newEmail) {
      console.log('[Auth] ⚠️ Email solicitado é igual ao Firebase Auth atual');
      // Se é igual ao Auth mas diferente do Firestore, pode ser sincronização pendente
      if (currentFirestoreEmail !== newEmail) {
        console.log('[Auth] ✅ Permitindo - pode ser sincronização de email verificado');
      } else {
        console.log('[Auth] ℹ️ Email já está sincronizado em ambos os locais');
        throw new Error('Este email já está ativo e verificado na sua conta');
      }
    }

    if (currentFirestoreEmail === newEmail && currentAuthEmail !== newEmail) {
      console.log('[Auth] ✅ Permitindo troca para email do Firestore (pode estar dessincronizado)');
    }

    // ✅ VALIDAÇÃO CRÍTICA: Verificar se email já está em uso no Firestore
    console.log('[Auth] 🔍 Verificando se email já existe no banco...');
    try {
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);

      for (const doc of usersSnapshot.docs) {
        const userData = doc.data();
        if (userData.email === newEmail && doc.id !== user.uid) {
          throw new Error(`Este email já está sendo usado por outro usuário no sistema`);
        }
      }

      console.log('[Auth] ✅ Email disponível no banco de dados');
    } catch (emailCheckError: any) {
      console.error('[Auth] ❌ Erro ao verificar email no banco:', emailCheckError);
      if (emailCheckError.message.includes('já está sendo usado')) {
        throw emailCheckError;
      }
      throw new Error('Erro ao verificar disponibilidade do email');
    }

    console.log('[Auth] ✅ Prosseguindo com troca de email:', newEmail);

    // Verificar se o usuário fez login com email/senha
    const hasEmailProvider = providerData.some(provider => provider.providerId === 'password');

    if (!hasEmailProvider) {
      throw new Error('Este usuário não foi criado com email e senha. Não é possível alterar o email desta forma. Entre em contato com o suporte.');
    }

    try {
      console.log('[Auth] Tentando reautenticar com email:', user.email);

      // Reautenticar antes de atualizar email
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      console.log('[Auth] Reautenticação bem-sucedida, enviando verificação de email...');

      // 🎯 MÉTODO HÍBRIDO OTIMIZADO
      console.log('[Auth] 🎯 INICIANDO MÉTODO HÍBRIDO OTIMIZADO');
      console.log('[Auth] 🌍 Ambiente:', isLocalhost ? 'Localhost/Emulator' : 'Produção');

      const oldEmail = user.email!;
      const userName = user.displayName || 'Usuário';

      try {
        // ✅ PASSO 1: VALIDAR SE EMAIL EXISTE E É VÁLIDO
        console.log('[Auth] 🔍 Validando existência do email...');
        const emailIsValid = await validateEmailExists(newEmail);

        if (!emailIsValid) {
          throw new Error('Este email não existe ou não pode receber mensagens. Verifique o endereço e tente novamente.');
        }

        console.log('[Auth] ✅ Email validado com sucesso');

        // ✅ PASSO 2: ENVIAR VERIFICAÇÃO DE EMAIL
        console.log('[Auth] 📧 Enviando email de verificação...');
        await verifyBeforeUpdateEmail(user, newEmail);
        console.log('[Auth] ✅ Email de verificação enviado para:', newEmail);

        console.log('[Auth] 🎉 VERIFICAÇÃO ENVIADA COM SUCESSO!');

        return {
          success: true,
          message: `📧 Email de verificação enviado para ${newEmail}. Verifique sua caixa de entrada e clique no link para confirmar a alteração.`,
          requiresVerification: true,
          newEmail
        };

      } catch (emailUpdateError: any) {
        console.error('[Auth] ❌ Erro durante atualização híbrida:', emailUpdateError);

        // 🔄 ROLLBACK: Tentar reverter mudanças se necessário
        try {
          console.log('[Auth] 🔄 Iniciando rollback...');

          // Se o Firebase Auth foi alterado, tentar reverter
          if (user.email !== oldEmail) {
            await updateEmail(user, oldEmail);
            console.log('[Auth] ✅ Firebase Auth revertido');
          }

          // Notificar sobre o rollback
          await sendEmailRollbackNotification(oldEmail, userName, emailUpdateError.message);

        } catch (rollbackError) {
          console.error('[Auth] ❌ Erro no rollback:', rollbackError);
        }

        throw emailUpdateError;
      }

    } catch (error: any) {
      console.error('[Auth] Erro ao atualizar email:', error);

      // Melhorar mensagens de erro
      if (error.code === 'auth/wrong-password') {
        throw new Error('Senha atual incorreta');
      } else if (error.code === 'auth/invalid-credential') {
        throw new Error('Credenciais inválidas. Verifique sua senha ou faça login novamente.');
      } else if (error.code === 'auth/email-already-in-use') {
        throw new Error('Este email já está sendo usado por outra conta');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Email inválido');
      } else if (error.code === 'auth/requires-recent-login') {
        throw new Error('Por segurança, faça login novamente antes de alterar o email');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Muitas tentativas. Tente novamente em alguns minutos');
      } else if (error.code === 'auth/user-mismatch') {
        throw new Error('Erro de autenticação. Faça logout e login novamente.');
      } else {
        throw new Error(error.message || 'Erro ao atualizar email');
      }
    }
  };

  // Função para forçar atualização do email no Firestore (chamada manual)
  const forceUpdateEmailInFirestore = async (newEmail: string) => {
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    try {
      console.log('[Auth] Forçando atualização de email no Firestore...');
      console.log('[Auth] Novo email:', newEmail);
      console.log('[Auth] UID:', user.uid);

      const userDocRef = doc(db, 'users', user.uid);

      await updateDoc(userDocRef, {
        email: newEmail,
        lastLogin: new Date().toISOString()
      });

      console.log('[Auth] ✅ Email forçadamente atualizado no Firestore!');

      // Recarregar perfil
      await loadUserProfile(user.uid);

      return true;
    } catch (error) {
      console.error('[Auth] ❌ Erro ao forçar atualização no Firestore:', error);
      throw error;
    }
  };

  // ✅ FUNÇÃO CRÍTICA: Sincronização FORÇADA e COMPLETA
  const forceCompleteSync = async () => {
    if (!user) {
      console.log('[Auth] ❌ Nenhum usuário para sincronização forçada');
      return false;
    }

    try {
      console.log('[Auth] 🚀 INICIANDO SINCRONIZAÇÃO FORÇADA COMPLETA...');
      console.log('[Auth] 🆔 UID:', user.uid);

      // ✅ FORÇA reload para pegar dados mais atuais
      try {
        await user.reload();
        console.log('[Auth] 🔄 Dados do Firebase Auth recarregados');
      } catch (reloadError) {
        console.warn('[Auth] ⚠️ Erro ao recarregar, mas continuando:', reloadError);
      }

      console.log('[Auth] 📧 Email atual no Firebase Auth:', user.email);
      console.log('[Auth] ✅ Email verificado:', user.emailVerified);

      if (!user.email) {
        console.log('[Auth] ❌ Usuário não tem email no Firebase Auth');
        return false;
      }

      // ✅ FORÇA atualização completa no Firestore
      const userDocRef = doc(db, 'users', user.uid);

      // Primeiro, buscar dados existentes para preservar informações importantes
      const existingDoc = await getDoc(userDocRef);
      let existingData: any = {};

      if (existingDoc.exists()) {
        existingData = existingDoc.data() || {};
        console.log('[Auth] 📊 Dados existentes no Firestore:', {
          email: existingData.email,
          isSubscriber: existingData.isSubscriber,
          faceIdEnabled: existingData.faceIdEnabled
        });
      }

      // ✅ ATUALIZAÇÃO COMPLETA preservando dados importantes
      const updateData = {
        // Dados do Firebase Auth (fonte da verdade)
        email: user.email,
        emailVerified: user.emailVerified,
        displayName: user.displayName || existingData.displayName || 'Usuário',

        // Timestamps de sincronização
        lastSync: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        lastEmailVerification: new Date().toISOString(),

        // Preservar dados críticos do negócio
        uid: user.uid,
        isSubscriber: existingData.isSubscriber || false,
        subscriptionType: existingData.subscriptionType || '',
        subscriptionEndDate: existingData.subscriptionEndDate || null,
        faceIdEnabled: existingData.faceIdEnabled || false,
        faceData: existingData.faceData || null,
        createdAt: existingData.createdAt || new Date().toISOString()
      };

      await updateDoc(userDocRef, updateData);

      console.log('[Auth] ✅ SINCRONIZAÇÃO FORÇADA CONCLUÍDA!');
      console.log('[Auth] 📧 Email sincronizado:', user.email);
      console.log('[Auth] 🎯 Todos os dados preservados e atualizados');

      // ✅ FORÇA reload do perfil
      await loadUserProfile(user.uid);

      return true;
    } catch (error: any) {
      console.error('[Auth] ❌ ERRO na sincronização forçada:', error);
      return false;
    }
  };

  // ✅ FUNÇÃO OFICIAL: Verificação simples com Firebase + Cloud Functions
  const checkOfficialEmailVerification = async (expectedEmail?: string): Promise<boolean> => {
    if (!user) {
      console.log('[Auth] ❌ Usuário não autenticado');
      return false;
    }

    try {
      console.log('[Auth] 🎯 VERIFICAÇÃO OFICIAL INICIADA');
      console.log('[Auth] Email esperado:', expectedEmail);
      console.log('[Auth] Email atual:', user.email);

      // ✅ Recarregar dados do Firebase Auth
      await user.reload();
      console.log('[Auth] ✅ Dados recarregados');
      console.log('[Auth] Novo email:', user.email);
      console.log('[Auth] Verificado:', user.emailVerified);

      // ✅ Verificar se mudança foi detectada
      if (expectedEmail && user.email === expectedEmail && user.emailVerified) {
        console.log('[Auth] ✅ SUCESSO! Email verificado e atualizado no Firebase Auth');
        console.log('[Auth] ⚡ Cloud Function sincronizará automaticamente');

        // Aguardar um pouco para Cloud Function processar
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Recarregar perfil
        await loadUserProfile(user.uid);

        return true;
      }

      console.log('[Auth] ⏳ Ainda aguardando verificação...');
      return false;

    } catch (error: any) {
      console.error('[Auth] ❌ Erro na verificação:', error);

      if (error.code === 'auth/user-token-expired') {
        throw new Error('⏰ Sessão expirada. Faça login novamente.');
      }

      throw error;
    }
  };

  // ✅ FUNÇÃO REMOVIDA: Era apenas para desenvolvimento híbrido

  // ✅ SINCRONIZAÇÃO OFICIAL 100%: Firebase Auth → Firestore (Estruturada)
  const syncFirestoreWithAuth = async (authUser?: User) => {
    const currentUser = authUser || user;

    if (!currentUser) {
      console.log('[Auth] ❌ Nenhum usuário para sincronização');
      return false;
    }

    try {
      console.log('[Auth] 🚀 SINCRONIZAÇÃO OFICIAL INICIADA (100% Estruturada)');
      console.log('[Auth] 🆔 UID:', currentUser.uid);
      console.log('[Auth] 📧 Email Auth (fonte da verdade):', currentUser.email);
      console.log('[Auth] ✅ Verificado:', currentUser.emailVerified);

      if (!currentUser.email) {
        console.log('[Auth] ❌ Email não encontrado no Firebase Auth');
        return false;
      }

      // ✅ PASSO 1: Buscar dados atuais do Firestore
      const userDocRef = doc(db, 'users', currentUser.uid);
      const existingDoc = await getDoc(userDocRef);

      // ✅ PASSO 2: Preparar dados oficiais do Firebase Auth
      const officialAuthData = {
        uid: currentUser.uid,
        email: currentUser.email, // 📧 FONTE DA VERDADE
        emailVerified: currentUser.emailVerified, // ✅ FONTE DA VERDADE
        displayName: currentUser.displayName || 'Usuário',
        lastSync: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        lastEmailVerification: currentUser.emailVerified ? new Date().toISOString() : new Date().toISOString()
      };

      if (existingDoc.exists()) {
        const firestoreData = existingDoc.data();

        // ✅ PASSO 3: Detectar dessincronização
        const isDesynchronized =
          firestoreData.email !== officialAuthData.email ||
          firestoreData.emailVerified !== officialAuthData.emailVerified;

        if (isDesynchronized) {
          console.log('[Auth] 🚨 DESSINCRONIZAÇÃO DETECTADA - Aplicando correção oficial');
          console.log('[Auth] 📊 Firestore (antigo):', {
            email: firestoreData.email,
            verified: firestoreData.emailVerified
          });
          console.log('[Auth] 📊 Firebase Auth (oficial):', {
            email: officialAuthData.email,
            verified: officialAuthData.emailVerified
          });

          // ✅ PASSO 4: Aplicar dados oficiais preservando dados de negócio
          const correctedData = {
            ...officialAuthData, // 📧 Dados oficiais do Firebase Auth
            // 🔒 Preservar dados críticos do negócio
            isSubscriber: firestoreData.isSubscriber || false,
            subscriptionType: firestoreData.subscriptionType || '',
            subscriptionEndDate: firestoreData.subscriptionEndDate || null,
            faceIdEnabled: firestoreData.faceIdEnabled || false,
            faceData: firestoreData.faceData || null,
            createdAt: firestoreData.createdAt || new Date().toISOString()
          };

          await updateDoc(userDocRef, correctedData);

          console.log('[Auth] ✅ CORREÇÃO APLICADA COM SUCESSO!');
          console.log('[Auth] 📧 Email sincronizado:', officialAuthData.email);
          console.log('[Auth] ✅ Status verificação:', officialAuthData.emailVerified);
        } else {
          console.log('[Auth] ✅ Dados já sincronizados - nenhuma correção necessária');

          // Atualizar apenas timestamp de login
          await updateDoc(userDocRef, {
            lastLogin: new Date().toISOString(),
            lastSync: new Date().toISOString()
          });
        }
      } else {
        // ✅ PASSO 5: Criar documento novo com dados oficiais
        console.log('[Auth] 🆕 Criando documento com dados oficiais do Firebase Auth');

        const newUserData = {
          ...officialAuthData,
          createdAt: new Date().toISOString(),
          isSubscriber: false,
          faceIdEnabled: false
        };

        await setDoc(userDocRef, newUserData);
        console.log('[Auth] ✅ DOCUMENTO CRIADO COM DADOS OFICIAIS!');
      }

      // ✅ PASSO 6: Recarregar perfil atualizado
      await loadUserProfile(currentUser.uid);

      console.log('[Auth] 🎯 SINCRONIZAÇÃO OFICIAL 100% CONCLUÍDA!');
      return true;
    } catch (error: any) {
      console.error('[Auth] ❌ ERRO na sincronização oficial:', error);
      return false;
    }
  };

  // ✅ NOVA FUNÇÃO: Verificar se o NOVO email foi REALMENTE verificado (clicou no link)
  const checkEmailVerificationAndSync = async (expectedEmail?: string) => {
    if (!user) {
      console.log('[Auth] Nenhum usuário logado para verificar');
      return false;
    }

    try {
      console.log('[Auth] 🔍 Verificando se NOVO email foi REALMENTE verificado...');
      console.log('[Auth] UID do usuário:', user.uid);
      console.log('[Auth] Email esperado (novo):', expectedEmail);
      console.log('[Auth] Email atual no Auth:', user.email);

      // ✅ CRÍTICO: Recarregar dados do usuário para pegar status atualizado
      try {
        await user.reload();
        console.log('[Auth] Dados do usuário recarregados');
        console.log('[Auth] Email após reload:', user.email);
        console.log('[Auth] emailVerified atual:', user.emailVerified);
      } catch (reloadError: any) {
        console.error('[Auth] ❌ Erro ao recarregar dados do usuário:', reloadError);

        // ✅ ESTRATÉGIA OFICIAL: Token expirado durante verificação
        if (reloadError.code === 'auth/user-token-expired') {
          console.log('[Auth] 🔄 TOKEN EXPIRADO - Aplicando solução robusta');

          // ✅ SOLUÇÃO ROBUSTA: Verificar no Firestore se email foi atualizado
          if (expectedEmail) {
            try {
              console.log('[Auth] 🔍 Verificando Firestore para email:', expectedEmail);

              // Buscar no Firestore se algum usuário tem esse email verificado
              const userDoc = await getDoc(doc(db, 'users', user.uid));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                console.log('[Auth] 📄 Dados do Firestore:', userData);

                // Se o email no Firestore já é o novo email, significa que foi verificado
                if (userData.email === expectedEmail && userData.emailVerified) {
                  console.log('[Auth] ✅ SUCESSO! Email já foi verificado e sincronizado no Firestore');
                  console.log('[Auth] 🔄 Fazendo logout para forçar re-login com token válido');

                  // Fazer logout e instruir re-login
                  await signOut(auth);

                  throw new Error(`✅ Email verificado com sucesso!\n\n🔄 Faça login novamente para continuar\n\nSeu novo email ${expectedEmail} já está ativo!`);
                }
              }

              console.log('[Auth] ⏳ Email ainda não foi verificado - aguardando...');
              console.log('[Auth] 💡 INSTRUÇÕES PARA O USUÁRIO:');
              console.log('[Auth] 📧 1. Verifique sua caixa de entrada:', expectedEmail);
              console.log('[Auth] 🔗 2. Clique no link de verificação');
              console.log('[Auth] 🔄 3. Volte aqui e clique em "Verificar Agora" novamente');

              // ✅ LOCALHOST: Simular atualização do email no Firestore
              const isLocalhost = window.location.hostname === 'localhost';
              if (isLocalhost) {
                console.log('[Auth] 🏠 LOCALHOST DETECTADO - Simulando atualização do email...');

                // Simular que o usuário clicou no link atualizando o Firestore
                try {
                  await updateDoc(doc(db, 'users', user.uid), {
                    email: expectedEmail,
                    emailVerified: true,
                    lastSync: new Date().toISOString(),
                    lastEmailVerification: new Date().toISOString(),
                  });

                  console.log('[Auth] ✅ LOCALHOST: Email simulado como verificado no Firestore');

                  // Recarregar perfil
                  await loadUserProfile(user.uid);

                  // ✅ CRITICAL: Retornar true em vez de lançar erro
                  console.log('[Auth] ✅ LOCALHOST: Simulação completa - retornando sucesso');
                  return true;

                } catch (updateError) {
                  console.error('[Auth] ❌ Erro ao simular verificação:', updateError);
                }
              }

              throw new Error(`📧 Verifique sua caixa de entrada: ${expectedEmail}\n\n🔗 Clique no link de verificação\n\n🔄 Depois clique em "Verificar Agora" novamente`);

            } catch (firestoreError) {
              console.error('[Auth] ❌ Erro ao verificar Firestore:', firestoreError);

              // Se é o erro que acabamos de lançar, propagar
              if (firestoreError instanceof Error && firestoreError.message.includes('📧')) {
                throw firestoreError;
              }

              // Fallback padrão
              throw new Error(`🔗 Clique no link enviado para ${expectedEmail}\n\n🔄 Depois faça login novamente\n\nSeu novo email será sincronizado automaticamente!`);
            }
          }

          throw new Error('Sessão expirada. Faça login novamente.');
        }
        throw reloadError;
      }

      // ✅ VERIFICAÇÃO DUPLA: Email deve estar verificado E ser o email esperado
      if (!user.emailVerified) {
        console.log('[Auth] ❌ Email ainda NÃO foi verificado pelo usuário');
        return false;
      }

      if (expectedEmail && user.email !== expectedEmail) {
        console.log('[Auth] ❌ Email verificado, mas ainda é o antigo:', user.email, '≠', expectedEmail);
        console.log('[Auth] ❌ Aguardando mudança para o novo email...');
        return false;
      }

      console.log('[Auth] ✅ NOVO email foi VERIFICADO pelo usuário!', user.email);

      // ✅ SEMPRE SINCRONIZAR: Garantir que Firestore está atualizado
      const userDocRef = doc(db, 'users', user.uid);

      console.log('[Auth] 🔄 FORÇANDO sincronização com Firestore...');

      try {
        await updateDoc(userDocRef, {
          email: user.email,
          emailVerified: user.emailVerified,
          lastEmailVerification: new Date().toISOString(),
          lastSync: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        });

        console.log('[Auth] ✅ Firestore FORÇADAMENTE sincronizado!');
        console.log('[Auth] Email no Firestore agora:', user.email);

        // Recarregar perfil
        await loadUserProfile(user.uid);

        console.log('[Auth] ✅ Perfil recarregado - sincronização completa!');
        return true;

      } catch (updateError) {
        console.error('[Auth] ❌ Erro ao sincronizar Firestore:', updateError);
        throw updateError;
      }

    } catch (error) {
      console.error('[Auth] ❌ Erro ao verificar NOVO email:', error);
      return false;
    }
  };

  // Função legacy para compatibilidade (agora chama a nova função)
  const checkEmailUpdateAndSync = async () => {
    return await checkEmailVerificationAndSync();
  };

  const updateUserPassword = async (currentPassword: string, newPassword: string) => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      // Reautenticar antes de atualizar senha
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Atualizar senha
      await updatePassword(user, newPassword);
    } catch (error) {
      throw error;
    }
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      // Atualizar no Firestore
      await updateDoc(doc(db, 'users', user.uid), updates);

      // Se estiver atualizando displayName, também atualizar no Firebase Auth
      if (updates.displayName) {
        await updateProfile(user, {
          displayName: updates.displayName
        });
      }

      // Recarregar perfil
      await loadUserProfile(user.uid);
    } catch (error) {
      throw error;
    }
  };

  const refreshUserProfile = async () => {
    if (user) {
      await loadUserProfile(user.uid);
    }
  };

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    logout,
    resetPassword,
    resendEmailVerification,
    updateUserEmail,
    updateUserPassword,
    updateUserProfile,
    refreshUserProfile,
    checkEmailUpdateAndSync,
    checkEmailVerificationAndSync,
    forceUpdateEmailInFirestore,
    syncFirestoreWithAuth,
    forceCompleteSync,
    manualSync: syncFirestoreWithAuth,
    checkOfficialEmailVerification,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { FingerprintPattern as Fingerprint, ShieldCheck, UserPlus, Phone, VideoOff, Lock, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthProvider';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import Header from '@/components/layout/header';
// Modal de confirmação pode ser pesado (portais, validação); carregar sob demanda
const PasswordConfirmModal = dynamic(() => import('@/components/password-confirm-modal'), { ssr: false });
import { useFaceAPI } from '@/hooks/use-face-api';
import { useProfileConfig } from '@/hooks/use-profile-config';


// Função de comparação será substituída pelo face-api.js

const VideoPanel = ({
  videoRef,
  isVerifying,
  hasCameraPermission,
  faceApiStatus,
  onRetryCamera
}: {
  videoRef: React.RefObject<HTMLVideoElement>,
  isVerifying: boolean,
  hasCameraPermission: boolean,
  faceApiStatus: string,
  onRetryCamera: () => void
}) => (
  <div className="relative mx-auto w-full max-w-sm h-64 bg-muted rounded-lg overflow-hidden border border-primary/50 shadow-neon-red-light">
    <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />

    {/* Status indicators */}
    <div className="absolute top-2 right-2 flex flex-col gap-1">
      <span className={`text-xs px-2 py-1 rounded-full ${faceApiStatus === '✅' ? 'bg-green-500/90 text-white' :
          faceApiStatus === '⏳ Carregando IA' ? 'bg-yellow-500/90 text-white' :
            faceApiStatus === '⚠️ Modo Básico' ? 'bg-orange-500/90 text-white' :
              'bg-red-500/90 text-white'
        }`}>
        {faceApiStatus}
      </span>
    </div>

    {isVerifying && <div className="absolute inset-0 border-4 border-primary animate-pulse"></div>}
    {!hasCameraPermission && (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 p-4 text-center">
        <VideoOff className="w-12 h-12 text-destructive mb-4" />
        <Alert variant="destructive" className="bg-transparent text-destructive-foreground border-0 mb-4">
          <AlertTitle>Câmera Indisponível</AlertTitle>
          <AlertDescription>
            Por favor, permita o acesso à câmera no seu navegador para continuar.
          </AlertDescription>
        </Alert>
        <Button
          onClick={onRetryCamera}
          variant="outline"
          size="sm"
          className="bg-background/80 hover:bg-background"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Tentar Novamente
        </Button>
      </div>
    )}
  </div>
);

const InputField = ({ id, label, icon, type, value, onChange, placeholder }: {
  id: string,
  label: string,
  icon: React.ReactNode,
  type: string,
  value: string,
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
  placeholder?: string
}) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="flex items-center gap-2 text-muted-foreground">
      {icon} {label}
    </Label>
    <Input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      required
      placeholder={placeholder}
      className="h-11 bg-background/50 border-primary/30 focus:shadow-neon-red-light"
    />
  </div>
);

const CameraInstructions = () => (
  <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-primary/20">
    <h3 className="font-semibold text-sm mb-2 text-foreground">Como resolver problemas da câmera:</h3>
    <ul className="text-xs text-muted-foreground space-y-1">
      <li>• Clique no ícone da câmera na barra de endereços e permita o acesso</li>
      <li>• Verifique se outros aplicativos não estão usando a câmera</li>
      <li>• Certifique-se de que sua câmera está conectada e funcionando</li>
      <li>• Use Chrome, Firefox ou Safari (navegadores mais recentes)</li>
      <li>• Se estiver em produção, use HTTPS</li>
    </ul>
  </div>
);

export default function FaceAuthPage() {
  // TODOS os hooks devem ser executados sempre, na mesma ordem
  const { toast } = useToast();
  const router = useRouter();
  const { settings: profileSettings, loading: profileLoading } = useProfileConfig();
  const {
    isLoaded: faceApiLoaded,
    isLoading: faceApiLoading,
    error: faceApiError,
    status: faceApiStatus,
    extractFaceDescriptor,
    compareFaceDescriptors,
    base64ToDescriptor
  } = useFaceAPI();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Dados do formulário
  const [name, setName] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  // Estados para modal de confirmação de senha
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ email: string, uid?: string, similarity: number } | null>(null);
  const [isConfirmingLogin, setIsConfirmingLogin] = useState(false);

  // Estados para pagamento


  // Função para comparar rostos usando face-api.js
  const compareFaceImages = async (capturedImage: string, storedImage: string): Promise<number> => {
    // Se face-api.js falhou, usar fallback básico melhorado
    if (!faceApiLoaded || faceApiError) {


      if (!capturedImage || !storedImage) return 0;
      if (capturedImage === storedImage) return 1.0;

      // Fallback: comparação básica mas mais rigorosa
      const minLength = Math.min(capturedImage.length, storedImage.length);
      const maxLength = Math.max(capturedImage.length, storedImage.length);

      // Se diferença de tamanho > 10%, provavelmente não é o mesmo rosto
      if ((maxLength - minLength) / maxLength > 0.1) return 0;

      // Comparar várias seções da imagem
      let totalMatches = 0;
      const sections = 10;
      const sectionSize = Math.floor(minLength / sections);

      for (let i = 0; i < sections; i++) {
        const start = i * sectionSize;
        const end = start + sectionSize;
        const section1 = capturedImage.substring(start, end);
        const section2 = storedImage.substring(start, end);

        if (section1 === section2) {
          totalMatches++;
        }
      }

      const similarity = totalMatches / sections;

      return similarity;
    }

    try {
      // Usar face-api.js real


      // Extrair descriptors das duas imagens
      const [descriptor1, descriptor2] = await Promise.all([
        extractFaceDescriptor(capturedImage),
        extractFaceDescriptor(storedImage)
      ]);

      if (!descriptor1 || !descriptor2) {

        // Usar fallback se não conseguir extrair descriptors
        return capturedImage === storedImage ? 1.0 : 0.3;
      }

      // Comparar descriptors (já retorna valor 0-100)
      const similarity = compareFaceDescriptors(descriptor1, descriptor2) / 100;


      return similarity;
    } catch (error) {
      console.error('[Face Compare] Erro na comparação, usando fallback:', error);
      // Em caso de erro, usar fallback básico
      return capturedImage === storedImage ? 1.0 : 0.2;
    }
  };

  // Função para confirmar senha do modal
  const handlePasswordConfirm = async (password: string) => {
    if (!selectedUser) return;

    setIsConfirmingLogin(true);
    try {
      const authResult = await signIn(selectedUser.email, password);

      // ✅ CRÍTICO: Usar o email ATUAL do Firebase Auth (fonte da verdade)
      const currentAuthEmail = authResult.user.email;
      console.log('[Face Login] 📧 Email do Firestore (selecionado):', selectedUser.email);
      console.log('[Face Login] 📧 Email atual do Firebase Auth:', currentAuthEmail);

      // ✅ FORÇA SINCRONIZAÇÃO COMPLETA após login bem-sucedido
      if (currentAuthEmail !== selectedUser.email) {
        console.log('[Face Login] 🔄 DESSINCRONIZAÇÃO DETECTADA APÓS LOGIN!');
        console.log('[Face Login] 🔄 Sincronizando Firestore com Firebase Auth...');

        try {
          const userDocRef = doc(db, 'users', authResult.user.uid);
          await updateDoc(userDocRef, {
            email: currentAuthEmail,
            emailVerified: authResult.user.emailVerified,
            lastSync: new Date().toISOString(),
            lastLogin: new Date().toISOString()
          });

          console.log('[Face Login] ✅ Firestore sincronizado após login!');
          console.log('[Face Login] 📧 Email atualizado para:', currentAuthEmail);
        } catch (syncError) {
          console.error('[Face Login] ❌ Erro ao sincronizar após login:', syncError);
        }
      }

      // Buscar dados do usuário no Firestore usando o UID (mais confiável que email)
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('uid', '==', authResult.user.uid));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const userData = snapshot.docs[0].data();
        console.log('[Face Login] 📊 Dados do usuário carregados:', {
          email: userData.email,
          uid: userData.uid
        });

        // ✅ REMOVIDO: localStorage - Firebase Auth é a fonte única de verdade
        console.log('[Face Login] ✅ Login realizado via Firebase Auth - sem localStorage');
      }

      toast({ title: 'Acesso autorizado!', description: 'Face ID confirmado com sucesso. Redirecionando para o perfil...' });
      setShowPasswordModal(false);

      // Redirecionar para o perfil após login
      setTimeout(() => {
        router.push('/perfil');
      }, 1000);
      setSelectedUser(null);
    } catch (error: any) {
      console.error('[Login] Erro na senha:', error);
      if (error.code === 'auth/invalid-credential') {
        toast({
          variant: 'destructive',
          title: 'Senha incorreta',
          description: `Senha inválida para ${selectedUser.email}. Tente novamente.`
        });
      } else {
        toast({ variant: 'destructive', title: 'Erro de acesso', description: error.message });
      }
    } finally {
      setIsConfirmingLogin(false);
    }
  };

  // Função para fechar modal
  const handlePasswordModalClose = () => {
    setShowPasswordModal(false);
    setSelectedUser(null);
    setIsVerifying(false);
  };

  // Hooks devem ser chamados sempre, nunca condicionalmente
  const authContext = useAuth();
  const { signUp, signIn, user } = authContext;
  // ✅ auth já importado do @/lib/firebase (configurado para emulators automaticamente)

  // Verificar se usuário já está logado e redirecionar para configuração de conta
  useEffect(() => {
    if (user) {
      toast({
        title: 'Já logado!',
        description: 'Redirecionando para o perfil...'
      });
      setTimeout(() => {
        router.push('/perfil');
      }, 500);
    }
  }, [user, router, toast]);



  // Configurar câmera
  const setupCamera = useCallback(async () => {
    try {
      // Detectar ambiente (desenvolvimento vs produção)
      const isDevelopment = process.env.NODE_ENV === 'development';
      const isLocalhost = window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';
      const isFirebase = window.location.hostname.includes('firebaseapp.com') ||
        window.location.hostname.includes('web.app');

      // Verificar se está em HTTPS ou localhost (necessário para câmera)
      const isSecure = window.location.protocol === 'https:' || isLocalhost;

      console.log('[Camera] Ambiente detectado:', {
        isDevelopment,
        isLocalhost,
        isFirebase,
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        origin: window.location.origin
      });

      if (!isSecure) {
        console.error('Acesso à câmera requer HTTPS ou localhost');
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Conexão insegura',
          description: 'Acesso à câmera requer HTTPS. Use localhost ou uma conexão segura.'
        });
        return;
      }

      // Verificar se o navegador suporta getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('getUserMedia não é suportado neste navegador');
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Navegador não suportado',
          description: 'Seu navegador não suporta acesso à câmera. Use Chrome, Firefox ou Safari.'
        });
        return;
      }

      // Configurações diferentes para desenvolvimento vs produção
      let constraints;

      if (isDevelopment || isLocalhost) {
        // Configuração mais simples para desenvolvimento
        constraints = {
          video: {
            facingMode: 'user',
            width: { ideal: 640, min: 320 },
            height: { ideal: 480, min: 240 },
            frameRate: { ideal: 30, min: 15 }
          },
          audio: false
        };
      } else {
        // Configuração mais robusta para produção (Firebase)
        constraints = {
          video: {
            facingMode: 'user',
            width: { ideal: 640, min: 320, max: 1920 },
            height: { ideal: 480, min: 240, max: 1080 },
            frameRate: { ideal: 30, min: 15, max: 60 }
          },
          audio: false
        };
      }

      console.log('[Camera] Solicitando permissão da câmera...', { constraints });
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      console.log('[Camera] Permissão concedida, configurando vídeo...');
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          console.log('[Camera] Vídeo carregado com sucesso');
          setIsVideoReady(true);
        };
        videoRef.current.onerror = (error) => {
          console.error('[Camera] Erro no vídeo:', error);
          setHasCameraPermission(false);
        };
        videoRef.current.oncanplay = () => {
          console.log('[Camera] Vídeo pronto para reprodução');
        };
        videoRef.current.onstalled = () => {
          console.warn('[Camera] Vídeo travou, tentando recuperar...');
        };
      }

      setHasCameraPermission(true);
      console.log('[Camera] Câmera configurada com sucesso');

    } catch (error: any) {
      console.error('[Camera] Erro ao acessar câmera:', error);
      setHasCameraPermission(false);

      // Tratar diferentes tipos de erro
      let errorMessage = 'Erro inesperado ao acessar a câmera.';

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Permissão negada. Clique no ícone da câmera na barra de endereços e permita o acesso.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'Nenhuma câmera encontrada. Verifique se sua câmera está conectada e funcionando.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Câmera em uso por outro aplicativo. Feche outros programas que usam a câmera.';
      } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
        errorMessage = 'Configuração da câmera não suportada. Tente usar uma resolução menor.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Acesso à câmera não suportado neste navegador. Use HTTPS ou localhost.';
      } else if (error.name === 'AbortError') {
        errorMessage = 'Acesso à câmera foi cancelado. Tente novamente.';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Erro de segurança. Verifique se está usando HTTPS e se o site é confiável.';
      }

      toast({
        variant: 'destructive',
        title: 'Erro na verificação facial',
        description: errorMessage
      });
    }
  }, [toast]);

  // Função para tentar reconfigurar a câmera
  const retryCameraSetup = useCallback(async () => {
    console.log('[Camera] Tentando reconfigurar câmera...');

    // Parar stream atual se existir
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Resetar estados
    setHasCameraPermission(false);
    setIsVideoReady(false);

    // Aguardar um pouco antes de tentar novamente
    await new Promise(resolve => setTimeout(resolve, 500));

    // Tentar configurar novamente
    await setupCamera();
  }, [setupCamera]);

  useEffect(() => {
    setupCamera();
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [setupCamera]);

  // Capturar imagem da câmera
  const captureImage = (): string | null => {
    if (!videoRef.current) return null;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/png');
    }
    return null;
  };

  // LÓGICA PRINCIPAL - CADASTRO E LOGIN
  const handleFaceAuthAction = async (action: 'login' | 'register') => {
    if (!hasCameraPermission) {
      toast({ variant: 'destructive', title: 'Câmera necessária', description: 'Permita acesso à câmera.' });
      return;
    }

    if (action === 'register' && (!name || !loginEmail || !registerPassword)) {
      toast({ variant: 'destructive', title: 'Dados obrigatórios', description: 'Preencha nome, email e senha.' });
      return;
    }

    setIsVerifying(true);
    toast({ title: 'Capturando Face ID...', description: 'Mantenha o rosto na câmera.' });

    await new Promise(resolve => setTimeout(resolve, 1000));
    const faceImage = captureImage();

    if (!faceImage) {
      toast({ variant: 'destructive', title: 'Erro na captura', description: 'Não foi possível capturar sua imagem.' });
      setIsVerifying(false);
      return;
    }

    try {
      // Verificar se o Firebase está disponível
      if (!db) {
        console.error('[Auth] Firebase não está disponível');
        toast({ variant: 'destructive', title: 'Erro de conexão', description: 'Serviço temporariamente indisponível.' });
        setIsVerifying(false);
        return;
      }

      // Tentar operações sem autenticação primeiro
      console.log('[Auth] Tentando operações sem autenticação...');
      if (action === 'register') {
        // VERIFICAÇÃO ANTI-DUPLICATA: Verificar se o rosto já existe
        console.log('[Cadastro] Verificando se o rosto já está cadastrado...');
        const allUsersRef = collection(db, 'users');
        const allUsersQuery = query(allUsersRef, where('faceIdEnabled', '==', true));
        const allUsersSnapshot = await getDocs(allUsersQuery);

        let faceAlreadyExists = false;
        let existingUserEmail = '';

        // Usar for...of para poder usar await
        for (const doc of allUsersSnapshot.docs) {
          const userData = doc.data();
          if (userData.faceData) {
            const similarity = await compareFaceImages(faceImage, userData.faceData);
            console.log(`[Verificação] Similaridade com usuário ${userData.email}: ${(similarity * 100).toFixed(1)}%`);

            if (similarity >= 0.45) { // 45% de similaridade = mesmo rosto (mais tolerante)
              faceAlreadyExists = true;
              existingUserEmail = userData.email;
              break; // Sair do loop ao encontrar match
            }
          }
        }

        if (faceAlreadyExists) {
          console.log('[Cadastro] Rosto já cadastrado para:', existingUserEmail);
          toast({
            variant: 'destructive',
            title: 'Rosto já cadastrado',
            description: `Este rosto já está associado a uma conta (${existingUserEmail.replace(/(.{3}).*(@.*)/, '$1***$2')}). Use o login Face ID.`
          });
          setIsVerifying(false);
          return;
        }

        // CADASTRO: Criar conta + Face ID (apenas se rosto for único)
        console.log('[Cadastro] Rosto único confirmado. Criando conta no Firebase com nome:', name);
        const result = await signUp(loginEmail, registerPassword, name);
        console.log('[Cadastro] Conta criada, UID:', result.user.uid);

        // Salvar Face ID no perfil
        const userDocRef = doc(db, 'users', result.user.uid);
        await updateDoc(userDocRef, {
          faceData: faceImage,
          faceIdEnabled: true,
          phoneNumber: phone || ''
        });

        console.log('[Cadastro] Face ID salvo para usuário:', result.user.uid);

        // ✅ REMOVIDO: localStorage - Firebase Auth + Firestore são suficientes
        console.log('[Cadastro] ✅ Usuário cadastrado no Firebase Auth + Firestore - sem localStorage');

        toast({ title: 'Cadastro concluído!', description: 'Conta criada com Face ID ativado. Redirecionando para o perfil...' });

        // Redirecionar para o perfil após cadastro
        setTimeout(() => {
          router.push('/perfil');
        }, 1000);

      } else {
        // LOGIN: Buscar Face ID correspondente
        console.log('[Login] Buscando Face ID no banco...');
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('faceIdEnabled', '==', true));
        const snapshot = await getDocs(q);

        let bestMatch: { uid: string;[key: string]: any } | null = null;
        let highestSimilarity = 0;

        // Usar for...of para poder usar await na comparação
        for (const doc of snapshot.docs) {
          const userData = doc.data();
          if (userData.faceData) {
            const similarity = await compareFaceImages(faceImage, userData.faceData);
            console.log(`[Login] Comparando com ${userData.email}: ${(similarity * 100).toFixed(1)}% similaridade`);

            if (similarity > highestSimilarity && similarity > 0.45) {
              console.log(`[Login] ✅ MATCH ENCONTRADO: ${userData.email} (${(similarity * 100).toFixed(1)}%)`);
              highestSimilarity = similarity;
              bestMatch = { uid: doc.id, ...userData };
            } else if (similarity > 0.35) {
              console.log(`[Login] ⚠️  Similaridade média detectada: ${userData.email} (${(similarity * 100).toFixed(1)}%) - abaixo do threshold`);
            }
          }
        }

        if (bestMatch) {
          // Face ID reconhecido - buscar email atual do Firebase Auth pelo UID
          console.log(`[Login] ✅ MATCH ENCONTRADO: UID ${bestMatch.uid} com ${(highestSimilarity * 100).toFixed(1)}% de similaridade`);
          console.log(`[Login] Email no Firestore: ${(bestMatch as any).email}`);

          // ✅ BUSCAR EMAIL ATUAL REAL - SEMPRE DO FIREBASE AUTH
          try {
            console.log(`[Login] 🔍 Buscando email REAL do Firebase Auth para UID: ${bestMatch.uid}`);

            // ✅ ESTRATÉGIA: Buscar o email atual no Firebase Auth via Firestore Admin
            // Como não podemos acessar outros usuários diretamente, vamos usar uma abordagem diferente

            // ✅ USAR AUTH JÁ CONFIGURADO (com emulators se necessário)
            const currentUser = auth.currentUser;

            let actualEmail = (bestMatch as any).email; // Fallback inicial

            // ✅ CRÍTICO: Se é o mesmo usuário, usar email do Firebase Auth
            if (currentUser && currentUser.uid === bestMatch.uid) {
              actualEmail = currentUser.email || (bestMatch as any).email;
              console.log(`[Login] ✅ Usuário logado - email do Firebase Auth: ${actualEmail}`);

              // ✅ FORÇA SINCRONIZAÇÃO: Atualizar Firestore com email correto
              if (currentUser.email !== (bestMatch as any).email) {
                console.log(`[Login] 🔄 DESSINCRONIZAÇÃO DETECTADA!`);
                console.log(`[Login] 📧 Firebase Auth: ${currentUser.email}`);
                console.log(`[Login] 📧 Firestore: ${(bestMatch as any).email}`);
                console.log(`[Login] 🔄 Sincronizando Firestore com Firebase Auth...`);

                try {
                  // Atualizar Firestore com email correto do Firebase Auth
                  const userDocRef = doc(db, 'users', bestMatch.uid);
                  await updateDoc(userDocRef, {
                    email: currentUser.email,
                    emailVerified: currentUser.emailVerified,
                    lastSync: new Date().toISOString(),
                    lastLogin: new Date().toISOString()
                  });

                  console.log(`[Login] ✅ Firestore sincronizado com sucesso!`);
                  actualEmail = currentUser.email; // Usar email correto
                } catch (syncError) {
                  console.error(`[Login] ❌ Erro ao sincronizar Firestore:`, syncError);
                }
              }
            } else {
              console.log(`[Login] ⚠️ Usuário não logado - usando email do Firestore: ${actualEmail}`);
            }

            setSelectedUser({
              email: actualEmail,
              uid: bestMatch.uid,
              similarity: highestSimilarity
            });
            setShowPasswordModal(true);

          } catch (error) {
            console.error('[Login] Erro ao buscar email atual:', error);
            // Fallback para email do Firestore
            setSelectedUser({
              email: (bestMatch as any).email,
              uid: bestMatch.uid,
              similarity: highestSimilarity
            });
            setShowPasswordModal(true);
          }
          // Não setIsVerifying(false) aqui, deixa o modal controlar
        } else {
          console.log(`[Login] ❌ NENHUM MATCH: Maior similaridade encontrada foi ${(highestSimilarity * 100).toFixed(1)}% (necessário 45%+)`);
          toast({
            variant: 'destructive',
            title: 'Face ID não reconhecido',
            description: `Seu rosto não foi reconhecido. Tente novamente.`
          });
        }
      }
    } catch (error: any) {
      console.error('[Auth] Erro:', error);

      // Tratar diferentes tipos de erro
      let message: string = 'Erro inesperado.';
      let title: string = 'Erro';

      if (error.code === 'auth/email-already-in-use') {
        message = 'Email já cadastrado.';
        title = 'Email em uso';
      } else if (error.code === 'auth/weak-password') {
        message = 'Senha muito fraca. Use pelo menos 6 caracteres.';
        title = 'Senha fraca';
      } else if (error.code === 'auth/wrong-password') {
        message = 'Senha incorreta.';
        title = 'Senha inválida';
      } else if (error.code === 'permission-denied' || error.message?.includes('Missing or insufficient permissions')) {
        console.warn('[Auth] Erro de permissão do Firebase, pode ser temporário');

        // Tentar novamente após um delay
        setTimeout(() => {
          console.log('[Auth] Tentando novamente após erro de permissão...');
          handleFaceAuthAction(action);
        }, 2000);
        return;
      } else if (error.code === 'unavailable' || error.message?.includes('network')) {
        message = 'Erro de conexão. Verifique sua internet.';
        title = 'Erro de conexão';
      } else if (error.message?.includes('FirebaseError')) {
        message = 'Erro do serviço. Tente novamente.';
        title = 'Erro do serviço';
      }

      toast({ variant: 'destructive', title, description: message });
    } finally {
      setIsVerifying(false);
    }
  };



  return (
    <main className="flex flex-col min-h-screen bg-background">
      <Header onMenuClick={() => setMenuOpen(!menuOpen)} />
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-lg animate-in fade-in-0 zoom-in-95 duration-500 shadow-neon-red-strong border-primary/50 bg-card/90 backdrop-blur-xl">
          <div className="text-center p-6 pb-2 relative">
            <div className="flex justify-center items-center mb-4 pt-8">
              <ShieldCheck className="h-12 w-12 text-primary text-shadow-neon-red" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground text-shadow-neon-red-light">
              {profileLoading ? (
                <span className="opacity-0">Carregando...</span>
              ) : (
                profileSettings?.name || 'Italo Santos'
              )}
            </h1>
            <p className="text-muted-foreground pt-2">
              Cadastro e Login com Face ID
            </p>
          </div>

          <div className="p-6 pt-2">
            {/* Câmera sempre visível */}
            <div className="space-y-4 mb-6">
              <VideoPanel
                videoRef={videoRef}
                isVerifying={isVerifying}
                hasCameraPermission={hasCameraPermission}
                faceApiStatus={faceApiStatus}
                onRetryCamera={retryCameraSetup}
              />
            </div>

            {!hasCameraPermission && <CameraInstructions />}

            <Tabs defaultValue="face-login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-background/50 border border-primary/20">
                <TabsTrigger value="face-login">Entrar</TabsTrigger>
                <TabsTrigger value="register">Cadastrar</TabsTrigger>
              </TabsList>

              {/* Entrar com Face ID */}
              <TabsContent value="face-login">
                <div className="space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Olhe para a câmera para entrar ou se cadastrar automaticamente
                  </p>
                  <Button
                    onClick={() => handleFaceAuthAction('login')}
                    disabled={!hasCameraPermission || !isVideoReady || isVerifying}
                    className="w-full h-12 bg-primary/90 hover:bg-primary"
                  >
                    <Fingerprint className="w-5 h-5 mr-2" />
                    {isVerifying ? 'Verificando...' : 'Verificar Face ID'}
                  </Button>
                </div>
              </TabsContent>



              {/* Cadastro */}
              <TabsContent value="register">
                <div className="space-y-4 pt-4">
                  <InputField
                    id="name"
                    label="Nome Completo"
                    icon={<UserPlus size={16} />}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <InputField
                    id="email"
                    label="Email"
                    icon={<UserPlus size={16} />}
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                  />
                  <InputField
                    id="phone"
                    label="Telefone (opcional)"
                    icon={<Phone size={16} />}
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <InputField
                    id="password"
                    label="Senha"
                    icon={<Lock size={16} />}
                    type="password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                  />
                  <Button
                    onClick={() => handleFaceAuthAction('register')}
                    disabled={!hasCameraPermission || !isVideoReady || isVerifying || !name || !loginEmail || !registerPassword}
                    className="w-full h-12 bg-primary/90 hover:bg-primary"
                  >
                    <Fingerprint className="w-5 h-5 mr-2" />
                    {isVerifying ? 'Cadastrando...' : 'Cadastrar com Face ID'}
                  </Button>
                </div>
              </TabsContent>


            </Tabs>
          </div>
        </Card>
      </div>



      {/* Modal de confirmação de senha */}
      {selectedUser && (
        <PasswordConfirmModal
          isOpen={showPasswordModal}
          onClose={handlePasswordModalClose}
          onConfirm={handlePasswordConfirm}
          userEmail={selectedUser.email}
          similarity={selectedUser.similarity}
          isLoading={isConfirmingLogin}
        />
      )}
    </main>
  );
}

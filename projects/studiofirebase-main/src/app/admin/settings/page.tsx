
"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Save, User as UserIcon, Phone, Mail, MapPin, Image as ImageIcon, Loader2, RefreshCw, ExternalLink, CreditCard, Instagram, Twitter, Youtube, MessageCircle, Star, Camera, Eye, EyeOff, Facebook, Send, X, Palette, Monitor } from "lucide-react";
import { saveProfileSettings, type ProfileSettings } from './actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { isSuperAdminUser, isSuperAdminUsername, SUPERADMIN_USERNAME } from '@/lib/superadmin-config';
import PasskeyManagement from '@/components/admin/PasskeyManagement';
import SecuritySettings from '@/components/admin/SecuritySettings';
import DraggablePreviewModal from '@/components/admin/DraggablePreviewModal';

const TipTapEditor = dynamic(() => import('@/components/tiptap-editor'), {
    ssr: false,
    loading: () => <p>Carregando editor...</p>
});

export default function AdminSettingsPage() {
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const pathname = usePathname() ?? '';
    const router = useRouter();
    const defaultAppearanceColors = {
        textColor: "#ffffff",
        numberColor: "#ffffff",
        buttonColor: "#ffffff",
        buttonTextColor: "#000000",
        lineColor: "#4b5563",
        neonGlowColor: "#ffffff",
        containerColor: "#111111",
        backgroundColor: "#000000",
        iconColor: "#ffffff",
        userSidebarIconColor: "#ffffff",
        adminSidebarIconColor: "#ffffff",
        secretChatColor: "#ffffff",
        whatsappBubbleColor: "#000000",
        iosHeaderBg: "#e5e5ea",
        iosHeaderBorder: "#c7c7cc"
    };
    const defaultAppearanceSettings = {
        ...defaultAppearanceColors,
        fontFamily: '"Times New Roman", Times, serif',
        fontSizePx: 16
    };
    const appearanceTemplates = {
        feminino: {
            textColor: "#ffffff",
            numberColor: "#ffffff",
            buttonColor: "#ff4d6d",
            buttonTextColor: "#ffffff",
            lineColor: "#ff8fab",
            neonGlowColor: "#ff4d6d",
            containerColor: "#3a0b1b",
            backgroundColor: "#1b070e",
            iconColor: "#ffffff"
        },
        masculino: {
            textColor: "#ffffff",
            numberColor: "#bcd4ff",
            buttonColor: "#60a5fa",
            buttonTextColor: "#0f172a",
            lineColor: "#1d4ed8",
            neonGlowColor: "#2563eb",
            containerColor: "#0b1f3a",
            backgroundColor: "#0a1324",
            iconColor: "#e2e8f0"
        },
        ios: {
            textColor: "#000000",
            numberColor: "#007AFF",
            buttonColor: "#007AFF",
            buttonTextColor: "#ffffff",
            lineColor: "#d1d1d6",
            neonGlowColor: "#007AFF",
            containerColor: "#f2f2f7",
            backgroundColor: "#ffffff",
            iconColor: "#007AFF",
            iosHeaderBg: "#e5e5ea",
            iosHeaderBorder: "#c7c7cc"
        }
    };



    // Detectar se é rota global /admin/... ou rota com slug /{username}/admin/...
    const adminSlugFromPath = pathname.match(/^\/([^\/]+)\/admin(\/|$)/)?.[1] ?? null;
    // IMPORTANTE: Se não há slug no path, é rota global (/admin/...)
    // Neste caso, usamos admin/profileSettings (global)
    const isGlobalAdminRoute = !adminSlugFromPath && pathname.startsWith('/admin');

    const [adminUsername, setAdminUsername] = useState<string>('');
    const [adminName, setAdminName] = useState<string>('');
    const [isMainAdmin, setIsMainAdmin] = useState<boolean>(false);
    const [targetAdminUid, setTargetAdminUid] = useState<string | null>(null);

    const [settings, setSettings] = useState<ProfileSettings | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
    const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
    const [isValidatingAddress, setIsValidatingAddress] = useState(false);
    const [addressValidation, setAddressValidation] = useState<{ valid: boolean; message: string } | null>(null);
    const [activeTab, setActiveTab] = useState('contact');
    const [isAppearancePreviewOpen, setIsAppearancePreviewOpen] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (activeTab === 'appearance') {
            setIsAppearancePreviewOpen(true);
        }
    }, [activeTab]);

    useEffect(() => {
        async function loadSettings() {
            setIsLoading(true);
            try {
                // Get current admin UID and username
                if (!user?.uid) {
                    console.log('[Settings] Aguardando autenticação do usuário...');
                    setIsLoading(false);
                    return;
                }

                console.log('[Settings] Carregando configurações para:', user.uid);
                console.log('[Settings] isGlobalAdminRoute:', isGlobalAdminRoute);
                console.log('[Settings] adminSlugFromPath:', adminSlugFromPath);

                // Fetch admin data to get username
                const adminDoc = await getDoc(doc(db, 'admins', user.uid));
                let loggedAdminUsername = '';
                let loggedIsMainAdmin = false;
                let loggedAdminEmail = '';
                if (adminDoc.exists()) {
                    const adminData = adminDoc.data();
                    loggedAdminUsername = adminData.username || '';
                    loggedAdminEmail = adminData.email || '';
                    loggedIsMainAdmin = Boolean(adminData.isMainAdmin);
                    setAdminUsername(loggedAdminUsername);
                    setAdminName(adminData.name || '');
                    setIsMainAdmin(loggedIsMainAdmin);
                }

                /**
                 * LÓGICA DE ROTEAMENTO ADMIN:
                 * 
                 * 1. ROTA GLOBAL (/admin/...):
                 *    - isGlobalAdminRoute = true
                 *    - adminSlugFromPath = null
                 *    - resolvedAdminUid = null → usa admin/profileSettings (GLOBAL)
                 *    - Apenas SuperAdmin pode editar o perfil global
                 * 
                 * 2. ROTA COM SLUG (/{username}/admin/...):
                 *    - isGlobalAdminRoute = false
                 *    - adminSlugFromPath = username
                 *    - resolvedAdminUid = uid do admin → usa admins/{uid}/profile/settings
                 */
                let resolvedAdminUid: string | null = null;

                if (isGlobalAdminRoute) {
                    // ROTA GLOBAL: /admin/... → usa admin/profileSettings
                    console.log('[Settings] 🌍 Rota global detectada - usando admin/profileSettings');
                    // Apenas SuperAdmin (severepics / pix@italosantos.com) pode editar o perfil global
                    if (!isSuperAdminUser({ username: loggedAdminUsername, email: loggedAdminEmail })) {
                        toast({
                            variant: 'destructive',
                            title: 'Acesso negado',
                            description: 'Apenas o SuperAdmin pode editar as configurações globais.',
                        });
                        const fallbackPath = loggedAdminUsername ? `/${loggedAdminUsername}/admin/settings` : '/';
                        router.replace(fallbackPath);
                        return;
                    }
                    // null = usa perfil global (admin/profileSettings)
                    resolvedAdminUid = null;
                } else if (adminSlugFromPath) {
                    // ROTA COM SLUG: /{username}/admin/... → usa perfil individual
                    console.log('[Settings] 👤 Rota com slug detectada:', adminSlugFromPath);
                    
                    // Se o slug é do SuperAdmin, usar perfil global
                    if (isSuperAdminUsername(adminSlugFromPath)) {
                        console.log('[Settings] 👑 Slug do SuperAdmin detectado - usando perfil global');
                        resolvedAdminUid = null;
                        setAdminUsername(SUPERADMIN_USERNAME);
                        setAdminName('SuperAdmin');
                    } else if (adminSlugFromPath === loggedAdminUsername) {
                        // Se é o próprio username do admin logado, usar seu UID
                        resolvedAdminUid = user.uid;
                    } else if (loggedIsMainAdmin) {
                        // MainAdmin pode editar outros admins - resolver UID pelo username
                        const adminsRef = collection(db, 'admins');
                        const q = query(adminsRef, where('username', '==', adminSlugFromPath), limit(1));
                        const snap = await getDocs(q);

                        if (!snap.empty) {
                            resolvedAdminUid = snap.docs[0].id;
                            const targetAdminData = snap.docs[0].data();
                            setAdminUsername(targetAdminData.username || adminSlugFromPath || '');
                            setAdminName(targetAdminData.name || '');
                        } else {
                            toast({
                                variant: 'destructive',
                                title: 'Admin não encontrado',
                                description: `Não encontrei o admin "${adminSlugFromPath}".`,
                            });
                            resolvedAdminUid = user.uid;
                        }
                    } else {
                        // Não é mainAdmin e tentou acessar outro perfil
                        toast({
                            variant: 'destructive',
                            title: 'Acesso negado',
                            description: 'Você não tem permissão para acessar este painel.',
                        });
                        const fallbackPath = loggedAdminUsername ? `/${loggedAdminUsername}/admin/settings` : '/admin/settings';
                        router.replace(fallbackPath);
                        resolvedAdminUid = user.uid;
                    }
                } else {
                    // Fallback: usar o UID do admin logado
                    resolvedAdminUid = user.uid;
                }

                setTargetAdminUid(resolvedAdminUid);
                console.log('[Settings] resolvedAdminUid final:', resolvedAdminUid || 'null (GLOBAL)');

                // Load profile settings via API
                // Se resolvedAdminUid é null, a API usará o perfil global (admin/profileSettings)
                const apiUrl = resolvedAdminUid
                    ? `/api/admin/profile-settings?adminUid=${resolvedAdminUid}`
                    : `/api/admin/profile-settings?global=true`; // Rota global explícita

                console.log('[Settings] Chamando API:', apiUrl);
                const response = await fetch(apiUrl, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(user ? { Authorization: `Bearer ${await user.getIdToken()}` } : {}),
                    },
                });

                if (!response.ok) {
                    throw new Error('Falha ao carregar configurações do servidor');
                }

                const loadedSettings = await response.json() as ProfileSettings;
                console.log('[Settings] Configurações carregadas:', loadedSettings);
                if (loadedSettings) {
                    // Ensure galleryPhotos has 7 items, padding with placeholders if needed
                    const gallery = loadedSettings.galleryPhotos || [];
                    while (gallery.length < 7) {
                        gallery.push({ url: "/placeholder-photo.svg" });
                    }
                    loadedSettings.galleryPhotos = gallery.slice(0, 7);

                    // Merge com dados padrão para garantir que todos os campos existam
                    const mergedSettings: ProfileSettings = {
                        ...loadedSettings,
                        socialMedia: {
                            instagram: loadedSettings.socialMedia?.instagram || '',
                            twitter: loadedSettings.socialMedia?.twitter || '',
                            youtube: loadedSettings.socialMedia?.youtube || '',
                            whatsapp: loadedSettings.socialMedia?.whatsapp || '',
                            telegram: loadedSettings.socialMedia?.telegram || ''
                        },
                        reviewSettings: {
                            showReviews: loadedSettings.reviewSettings?.showReviews ?? true,
                            moderateReviews: loadedSettings.reviewSettings?.moderateReviews ?? true,
                            defaultReviewMessage: loadedSettings.reviewSettings?.defaultReviewMessage || '',
                            sendReviewToSecretChat: loadedSettings.reviewSettings?.sendReviewToSecretChat ?? true
                        },
                        paymentSettings: {
                            pixValue: loadedSettings.paymentSettings?.pixValue ?? 99.00,
                            pixKey: loadedSettings.paymentSettings?.pixKey || '',
                            pixKeyType: loadedSettings.paymentSettings?.pixKeyType || 'email'
                        },
                        footerSettings: {
                            showTwitter: loadedSettings.footerSettings?.showTwitter ?? false,
                            twitterUrl: loadedSettings.footerSettings?.twitterUrl || '',
                            showInstagram: loadedSettings.footerSettings?.showInstagram ?? false,
                            instagramUrl: loadedSettings.footerSettings?.instagramUrl || '',
                            showYoutube: loadedSettings.footerSettings?.showYoutube ?? false,
                            youtubeUrl: loadedSettings.footerSettings?.youtubeUrl || '',
                            showWhatsapp: loadedSettings.footerSettings?.showWhatsapp ?? false,
                            whatsappUrl: loadedSettings.footerSettings?.whatsappUrl || '',
                            showTelegram: loadedSettings.footerSettings?.showTelegram ?? false,
                            telegramUrl: loadedSettings.footerSettings?.telegramUrl || '',
                            showFacebook: loadedSettings.footerSettings?.showFacebook ?? false,
                            facebookUrl: loadedSettings.footerSettings?.facebookUrl || ''
                        },
                        appearanceSettings: {
                            textColor: loadedSettings.appearanceSettings?.textColor || '#ffffff',
                            numberColor: loadedSettings.appearanceSettings?.numberColor || '#ffffff',
                            buttonColor: loadedSettings.appearanceSettings?.buttonColor || '#ffffff',
                            buttonTextColor: loadedSettings.appearanceSettings?.buttonTextColor || '#000000',
                            lineColor: loadedSettings.appearanceSettings?.lineColor || '#4b5563',
                            neonGlowColor: loadedSettings.appearanceSettings?.neonGlowColor || '#ffffff',
                            containerColor: loadedSettings.appearanceSettings?.containerColor || '#111111',
                            backgroundColor: loadedSettings.appearanceSettings?.backgroundColor || '#000000',
                            fontFamily: loadedSettings.appearanceSettings?.fontFamily || '"Times New Roman", Times, serif',
                            fontSizePx: loadedSettings.appearanceSettings?.fontSizePx ?? 16,
                            iconColor: loadedSettings.appearanceSettings?.iconColor || '#ffffff',
                            userSidebarIconColor: loadedSettings.appearanceSettings?.userSidebarIconColor || '#ffffff',
                            adminSidebarIconColor: loadedSettings.appearanceSettings?.adminSidebarIconColor || '#ffffff',
                            secretChatColor: loadedSettings.appearanceSettings?.secretChatColor || '#ffffff',
                            whatsappBubbleColor: loadedSettings.appearanceSettings?.whatsappBubbleColor || '#000000',
                            iosHeaderBg: loadedSettings.appearanceSettings?.iosHeaderBg || '#e5e5ea',
                            iosHeaderBorder: loadedSettings.appearanceSettings?.iosHeaderBorder || '#c7c7cc'
                        }
                    };
                    setSettings(mergedSettings);
                    console.log('[Settings] Estado atualizado com sucesso');
                }
            } catch (error) {
                console.error('[Settings] Erro ao carregar configurações:', error);
                toast({
                    variant: "destructive",
                    title: "Erro ao carregar configurações",
                    description: error instanceof Error ? error.message : 'Erro desconhecido'
                });
                // Mesmo com erro, permitir que o usuário veja o formulário com dados padrão
                setIsLoading(false);
            } finally {
                setIsLoading(false);
            }
        }

        if (user) {
            loadSettings();
        }

    }, [user, adminSlugFromPath]); // Removido 'toast' das dependências para evitar loop infinito



    const handleInputChange = <K extends keyof ProfileSettings>(field: K, value: ProfileSettings[K]) => {
        setSettings(prev => prev ? ({ ...prev, [field]: value }) : null);
    };

    const handleRestoreDefaultColors = () => {
        setSettings(prev => {
            if (!prev) return null;
            return {
                ...prev,
                appearanceSettings: {
                    ...defaultAppearanceSettings,
                    ...defaultAppearanceColors,
                    fontFamily: prev.appearanceSettings?.fontFamily ?? defaultAppearanceSettings.fontFamily,
                    fontSizePx: prev.appearanceSettings?.fontSizePx ?? defaultAppearanceSettings.fontSizePx
                } as ProfileSettings['appearanceSettings']
            };
        });
        toast({
            title: 'Cores restauradas',
            description: 'Os padroes de cores foram reaplicados.'
        });
    };

    const handleApplyAppearanceTemplate = (template: keyof typeof appearanceTemplates) => {
        const templateColors = appearanceTemplates[template];
        setSettings(prev => {
            if (!prev) return null;
            return {
                ...prev,
                appearanceSettings: {
                    ...defaultAppearanceSettings,
                    ...templateColors,
                    fontFamily: prev.appearanceSettings?.fontFamily ?? defaultAppearanceSettings.fontFamily,
                    fontSizePx: prev.appearanceSettings?.fontSizePx ?? defaultAppearanceSettings.fontSizePx
                } as ProfileSettings['appearanceSettings']
            };
        });
        toast({
            title: 'Template aplicado',
            description: template === 'feminino'
                ? 'Template feminino (vermelho, rosa e branco) aplicado.'
                : template === 'masculino'
                    ? 'Template masculino (azul escuro, branco e azul claro) aplicado.'
                    : 'Template iOS (branco, cinza claro e azul sistema) aplicado.'
        });
    };

    // Endereços populares pré-definidos
    const popularAddresses = [
        "Copacabana, Rio de Janeiro, RJ, Brasil",
        "Ipanema, Rio de Janeiro, RJ, Brasil",
        "Avenida Paulista, São Paulo, SP, Brasil",
        "Vila Madalena, São Paulo, SP, Brasil",
        "Savassi, Belo Horizonte, MG, Brasil",
        "Asa Norte, Brasília, DF, Brasil",
        "Pelourinho, Salvador, BA, Brasil",
        "Boa Viagem, Recife, PE, Brasil"
    ];

    // Função para buscar sugestões de endereço
    const searchAddressSuggestions = async (query: string) => {
        if (query.length < 2) {
            setAddressSuggestions([]);
            setShowAddressSuggestions(false);
            return;
        }

        try {
            let suggestions: string[] = [];

            if (query.length < 3) {
                // Para queries curtas, mostrar endereços populares
                suggestions = popularAddresses.filter(addr =>
                    addr.toLowerCase().includes(query.toLowerCase())
                ).slice(0, 5);
            } else {
                // Para queries mais longas, gerar sugestões baseadas na query
                const baseSuggestions = [
                    `${query}, São Paulo, SP, Brasil`,
                    `${query}, Rio de Janeiro, RJ, Brasil`,
                    `${query}, Belo Horizonte, MG, Brasil`,
                    `${query}, Brasília, DF, Brasil`,
                    `${query}, Salvador, BA, Brasil`
                ];

                // Combinar com endereços populares que fazem match
                const popularMatches = popularAddresses.filter(addr =>
                    addr.toLowerCase().includes(query.toLowerCase())
                );

                suggestions = [...popularMatches, ...baseSuggestions].slice(0, 5);
            }

            setAddressSuggestions(suggestions);
            setShowAddressSuggestions(suggestions.length > 0);
        } catch (error) {
            console.error('Erro ao buscar sugestões:', error);
        }
    };

    // Função para validar endereço
    const validateAddress = async (address: string) => {
        if (!address) {
            setAddressValidation(null);
            return;
        }

        setIsValidatingAddress(true);

        try {
            // Simular validação (em produção, usar Google Geocoding API)
            await new Promise(resolve => setTimeout(resolve, 1000));

            const isValid = address.length > 10 && (
                address.toLowerCase().includes('brasil') ||
                address.toLowerCase().includes('brazil') ||
                address.includes('SP') ||
                address.includes('RJ') ||
                address.includes('MG')
            );

            setAddressValidation({
                valid: isValid,
                message: isValid
                    ? '✅ Endereço válido - O mapa será atualizado'
                    : '⚠️ Endereço pode não ser encontrado no mapa'
            });
        } catch (error) {
            setAddressValidation({
                valid: false,
                message: '❌ Erro ao validar endereço'
            });
        } finally {
            setIsValidatingAddress(false);
        }
    };

    // Função para lidar com mudanças no endereço
    const handleAddressChange = (value: string) => {
        handleInputChange('address', value);
        setShowAddressSuggestions(false);

        // Buscar sugestões com debounce
        const timeoutId = setTimeout(() => {
            searchAddressSuggestions(value);
            validateAddress(value);
        }, 500);

        return () => clearTimeout(timeoutId);
    };

    // Função para gerar URL do Google Maps - IGUAL à usada no footer do cliente
    const getGoogleMapsUrl = (address: string) => {
        if (!address) {
            // Fallback para endereço padrão se não houver endereço configurado
            return "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3657.145944983025!2d-46.656539084476!3d-23.56306366754635!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94ce59c8da0aa315%3A0x2665c5b4e7b6a4b!2sAv.%20Paulista%2C%20S%C3%A3o%20Paulo%20-%20SP%2C%20Brasil!5e0!3m2!1spt-BR!2sus!4v1625845012345!5m2!1spt-BR!2sus";
        }

        // Encode o endereço para uso na URL
        const encodedAddress = encodeURIComponent(address);

        // Usar a URL simples do Google Maps que não requer API key
        // Esta abordagem gera um iframe baseado na busca do endereço
        return `https://maps.google.com/maps?q=${encodedAddress}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    };

    const handleNestedChange = (section: 'bankAccount' | 'socialMedia' | 'reviewSettings' | 'paymentSettings' | 'footerSettings' | 'appearanceSettings', field: string, value: string | boolean | number) => {
        setSettings(prev => {
            if (!prev) return null;
            return {
                ...prev,
                [section]: {
                    ...prev[section],
                    [field]: value
                }
            };
        });
    };

    const handleGalleryChange = (index: number, value: string) => {
        setSettings(prev => {
            if (!prev) return null;
            const newGallery = [...(prev.galleryPhotos || [])];
            newGallery[index] = { ...newGallery[index], url: value };
            return { ...prev, galleryPhotos: newGallery };
        });
    };

    const handleGalleryNameChange = (index: number, value: string) => {
        setSettings(prev => {
            if (!prev) return null;
            const newGalleryNames = [...(prev.galleryNames || [])];
            newGalleryNames[index] = value;
            return { ...prev, galleryNames: newGalleryNames };
        });
    };

    const loadExampleTemplate = () => {

        const exampleTemplate = `<h1>Página de Configurações - Contato</h1>

<p>Esta página permite que você <strong>personalize todas as informações de contato</strong> exibidas em seu site. Utilize os recursos abaixo para criar uma presença profissional e atrativa.</p>

<hr>

<h2>Funcionalidades Disponíveis</h2>

<h3>📝 Informações Básicas</h3>
<ul>
<li><strong>Nome</strong>: Defina o nome que será exibido publicamente</li>
<li><strong>Email</strong>: Configure seu email de contato principal</li>
<li><strong>Telefone</strong>: Adicione seu número de telefone ou WhatsApp</li>
<li><strong>Descrição</strong>: Escreva uma descrição personalizada usando HTML para formatação avançada</li>
</ul>

<h3>📍 Localização</h3>
<ul>
<li><strong>Endereço</strong>: Insira seu endereço completo</li>
<li><strong>Integração com Google Maps</strong>: O sistema gera automaticamente um mapa incorporado baseado no endereço fornecido</li>
<li><strong>Validação de Endereço</strong>: Sugestões automáticas para garantir precisão</li>
</ul>

<h3>🌐 Redes Sociais</h3>
<ul>
<li>Conecte suas redes sociais (Instagram, Twitter, LinkedIn, etc.)</li>
<li>Links exibidos automaticamente no rodapé do site</li>
</ul>

<h3>💳 Informações de Pagamento</h3>
<ul>
<li><strong>Dados Bancários</strong>: Configure informações para transferências</li>
<li><strong>Integrações de Pagamento</strong>: PayPal, Stripe, Mercado Pago e outros</li>
</ul>

<hr>

<h2>🛠️ Ferramentas e Recursos</h2>

<h3>Editor HTML</h3>
<p>A descrição suporta <strong>formatação HTML completa</strong>. Você pode usar:</p>
<ul>
<li>Títulos (<code>&lt;h1&gt;</code>, <code>&lt;h2&gt;</code>, <code>&lt;h3&gt;</code>)</li>
<li>Parágrafos (<code>&lt;p&gt;</code>)</li>
<li>Listas ordenadas e não ordenadas (<code>&lt;ul&gt;</code>, <code>&lt;ol&gt;</code>)</li>
<li>Negrito e itálico (<code>&lt;strong&gt;</code>, <code>&lt;em&gt;</code>)</li>
<li>Links e imagens (<code>&lt;a&gt;</code>, <code>&lt;img&gt;</code>)</li>
<li>Blocos de citação (<code>&lt;blockquote&gt;</code>)</li>
</ul>

<h3>Pré-visualização</h3>
<p>Visualize as alterações em tempo real antes de salvar.</p>

<h3>Template de Exemplo</h3>
<p>Use o botão <strong>"Carregar Template"</strong> para popular os campos com este exemplo e adaptá-lo às suas necessidades.</p>

<hr>

<h2>💡 Dicas de Uso</h2>
<blockquote>
<p>✅ Mantenha as informações sempre atualizadas</p>
<p>✅ Use uma descrição clara e objetiva</p>
<p>✅ Verifique se o endereço está correto para integração com mapas</p>
<p>✅ Teste os links de redes sociais após salvar</p>
</blockquote>

<p><strong>💾 Não esqueça de salvar as alterações</strong> ao finalizar suas edições!</p>`;

        handleInputChange('description', exampleTemplate);

        toast({
            title: "Template carregado!",
            description: "Um exemplo de descrição com HTML foi carregado. Edite conforme necessário.",
        });
    };

    const handleSaveChanges = async () => {
        if (!settings) return;
        setIsSaving(true);
        try {
            const isDriveUrl = (value?: string) => {
                if (!value) return false;
                const normalized = value.toLowerCase();
                return normalized.includes('drive.google.com') || normalized.includes('docs.google.com');
            };

            // Validar dados obrigatórios
            if (!settings.name || !settings.email || !settings.phone) {
                throw new Error('Nome, email e telefone são obrigatórios');
            }

            if (isDriveUrl(settings.profilePictureUrl) || isDriveUrl(settings.coverPhotoUrl)) {
                throw new Error('Links do Google Drive não são permitidos para foto de perfil/capa. Use upload local ou URL pública direta.');
            }

            const hasDriveGalleryUrl = (settings.galleryPhotos || []).some((photo) => isDriveUrl(photo?.url));
            if (hasDriveGalleryUrl) {
                throw new Error('Links do Google Drive não são permitidos nas galerias 1-7. Use upload local ou URL pública direta.');
            }

            if (!user?.uid) {
                throw new Error('Usuário não autenticado');
            }

            /**
             * LÓGICA DE SALVAMENTO:
             * - targetAdminUid = null → salvar em admin/profileSettings (GLOBAL)
             * - targetAdminUid = uid → salvar em admins/{uid}/profile/settings (individual)
             */
            const uidToSave = targetAdminUid ?? undefined; // undefined = global, string = individual
            console.log('[Settings] Salvando configurações para:', uidToSave || 'GLOBAL (admin/profileSettings)');
            await saveProfileSettings(settings, uidToSave);

            // Forçar limpeza do cache para garantir que as mudanças sejam refletidas
            localStorage.removeItem('profileSettings');
            localStorage.removeItem('profileSettings:global');
            if (adminUsername) {
                localStorage.removeItem(`profileSettings:${adminUsername}`);
            }

            toast({
                title: "Configurações Salvas!",
                description: targetAdminUid
                    ? "Suas informações foram atualizadas com sucesso."
                    : "Configurações globais atualizadas com sucesso.",
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao Salvar",
                description: error instanceof Error ? error.message : "Não foi possível salvar as configurações.",
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (!user) {
        return (
            <div className="flex flex-col justify-center items-center h-full gap-4">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-muted-foreground">Aguardando autenticação...</p>
            </div>
        );
    }

    if (isLoading || !settings) {
        return (
            <div className="flex flex-col justify-center items-center h-full gap-4">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-muted-foreground">Carregando configurações...</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-full overflow-x-hidden space-y-4 sm:space-y-6 px-2 sm:px-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="w-full sm:w-auto">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Configurações do Perfil</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Gerencie todas as suas informações pessoais e configurações
                    </p>
                    {adminName && adminUsername && (
                        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full">
                            <UserIcon className="h-3 w-3 text-primary" />
                            <span className="text-xs font-medium text-primary">
                                Editando perfil de: {adminName} (@{adminUsername})
                            </span>
                        </div>
                    )}
                </div>
                <Button onClick={handleSaveChanges} disabled={isSaving} className="w-full sm:w-auto text-sm">
                    {isSaving ? <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : <Save className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />}
                    {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1 h-auto">
                    <TabsTrigger value="contact" className="text-xs sm:text-sm px-2 py-2">Contato</TabsTrigger>
                    <TabsTrigger value="general" className="text-xs sm:text-sm px-2 py-2">Geral</TabsTrigger>
                    <TabsTrigger value="images" className="text-xs sm:text-sm px-2 py-2">Imagens</TabsTrigger>
                    <TabsTrigger value="reviews" className="text-xs sm:text-sm px-2 py-2">Avaliações</TabsTrigger>
                    <TabsTrigger value="payment" className="text-xs sm:text-sm px-2 py-2">Pagamento</TabsTrigger>
                    <TabsTrigger value="appearance" className="text-xs sm:text-sm px-2 py-2">Personalização</TabsTrigger>
                    <TabsTrigger value="security" className="text-xs sm:text-sm px-2 py-2">Segurança</TabsTrigger>
                </TabsList>

                <TabsContent value="contact" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <UserIcon className="h-5 w-5" />
                                Informações de Contato
                            </CardTitle>
                            <CardDescription>Estes dados serão exibidos publicamente no seu site.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="flex items-center gap-2"><UserIcon /> Nome de Exibição</Label>
                                    <Input id="name" value={settings.name} onChange={(e) => handleInputChange('name', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="flex items-center gap-2"><Mail /> Email de Contato</Label>
                                    <Input id="email" type="email" value={settings.email} onChange={(e) => handleInputChange('email', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="flex items-center gap-2"><Phone /> Telefone (WhatsApp)</Label>
                                    <Input id="phone" placeholder="Ex: 5521999998888" value={settings.phone} onChange={(e) => handleInputChange('phone', e.target.value)} />
                                </div>
                                <div className="space-y-3 relative p-4 bg-card/50 rounded-xl border border-border">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="address" className="flex items-center gap-2">
                                            <div className="p-1.5 bg-primary/10 rounded-full">
                                                <MapPin className="h-4 w-4 text-primary" />
                                            </div>
                                            <span className="font-semibold text-foreground">Endereço (para o mapa)</span>
                                            {isValidatingAddress && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                                        </Label>
                                        {settings.address && addressValidation?.valid && (
                                            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                                <span className="text-xs font-medium text-green-400">Configurado</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <Input
                                            id="address"
                                            value={settings.address}
                                            onChange={(e) => handleAddressChange(e.target.value)}
                                            onFocus={() => {
                                                if (settings.address.length < 2) {
                                                    // Mostrar endereços populares quando foca no campo vazio
                                                    setAddressSuggestions(popularAddresses.slice(0, 5));
                                                    setShowAddressSuggestions(true);
                                                }
                                            }}
                                            onBlur={() => {
                                                // Delay para permitir clique nas sugestões
                                                setTimeout(() => setShowAddressSuggestions(false), 200);
                                            }}
                                            placeholder="Ex: Rua das Flores, 123, Copacabana, Rio de Janeiro, RJ, Brasil"
                                            className={`pr-10 transition-all duration-200 ${showAddressSuggestions ? 'border-primary/50 ring-2 ring-primary/10' : ''
                                                }`}
                                            autoComplete="off"
                                        />
                                        {settings.address && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                                                onClick={() => {
                                                    handleInputChange('address', '');
                                                    setAddressValidation(null);
                                                    setShowAddressSuggestions(false);
                                                }}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>

                                    {/* Sugestões de endereço */}
                                    {showAddressSuggestions && addressSuggestions.length > 0 && (
                                        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                            <div className="py-1">
                                                {addressSuggestions.map((suggestion, index) => (
                                                    <button
                                                        key={index}
                                                        type="button"
                                                        className="w-full text-left px-4 py-3 hover:bg-primary/10 text-sm text-foreground border-b border-border last:border-b-0 transition-colors duration-150 focus:outline-none focus:bg-primary/10"
                                                        onClick={() => {
                                                            handleInputChange('address', suggestion);
                                                            setShowAddressSuggestions(false);
                                                            validateAddress(suggestion);
                                                        }}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <MapPin className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                                                            <div className="flex-1">
                                                                <div className="font-medium text-foreground">
                                                                    {suggestion.split(',')[0]}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground mt-0.5">
                                                                    {suggestion.split(',').slice(1).join(',').trim()}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="px-4 py-2 bg-card/50 border-t border-border">
                                                <p className="text-xs text-primary flex items-center gap-2 font-medium">
                                                    <span className="text-primary">📍</span>
                                                    {addressSuggestions.length} endereço{addressSuggestions.length !== 1 ? 's' : ''} encontrado{addressSuggestions.length !== 1 ? 's' : ''}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Validação do endereço */}
                                    {addressValidation && (
                                        <div className={`text-sm p-2 rounded-md ${addressValidation.valid
                                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                            : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                            }`}>
                                            {addressValidation.message}
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-muted-foreground">
                                            💡 Dica: Use endereços completos com cidade, estado e país para melhor precisão no mapa
                                        </p>
                                        {!settings.address && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setAddressSuggestions(popularAddresses);
                                                    setShowAddressSuggestions(true);
                                                }}
                                                className="text-xs h-7 px-2"
                                            >
                                                <MapPin className="h-3 w-3 mr-1" />
                                                Ver locais populares
                                            </Button>
                                        )}
                                    </div>

                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="description" className="flex items-center gap-2">
                                        <Camera className="h-4 w-4" />
                                        Descrição Profissional (Editor Visual - HTML)
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={loadExampleTemplate}
                                            className="flex items-center gap-2"
                                        >
                                            📝 Carregar Template
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                handleInputChange('description', '');
                                                toast({
                                                    title: "Descrição limpa!",
                                                    description: "O conteúdo foi removido do editor.",
                                                });
                                            }}
                                            className="flex items-center gap-2"
                                        >
                                            🗑️ Limpar
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <TipTapEditor
                                        value={settings.description || ''}
                                        onChange={(content) => handleInputChange('description', content)}
                                        placeholder="Digite sua descrição profissional aqui..."
                                    />
                                </div>

                                <div className="text-xs text-muted-foreground space-y-1">
                                    <p><strong>Como usar o Editor TipTap:</strong></p>
                                    <ul className="list-disc list-inside space-y-1">
                                        <li>✅ <strong>Selecione o texto</strong> e clique nos botões da toolbar</li>
                                        <li>✅ <strong>H1, H2, H3</strong> = Títulos</li>
                                        <li>✅ <strong>B</strong> = <strong>Negrito</strong></li>
                                        <li>✅ <em>I</em> = <em>Itálico</em></li>
                                        <li>✅ <u>U</u> = <u>Sublinhado</u></li>
                                        <li>✅ <s>S</s> = <s>Tachado</s></li>
                                        <li>✅ <strong>📋</strong> = Listas (ordenadas e não ordenadas)</li>
                                        <li>✅ <strong>↔️</strong> = Alinhamento (esquerda, centro, direita)</li>
                                        <li>✅ <strong>🔗</strong> = Links</li>
                                        <li>✅ <strong>🖼️</strong> = Imagens</li>
                                        <li>✅ <strong>&quot;</strong> = Citações</li>
                                        <li>✅ <strong>&lt;/&gt;</strong> = Blocos de código</li>
                                        <li>✅ <strong>🧹</strong> = Limpar formatação</li>
                                        <li>✅ <strong>Totalmente responsivo</strong> - funciona em PC e celular!</li>
                                        <li>⚠️ <strong>Não digite Markdown</strong> - use os botões visuais!</li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="general" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Eye className="h-5 w-5" />
                                Configurações Gerais do Site
                            </CardTitle>
                            <CardDescription>
                                Configure textos, elementos gerais e ícones do footer que aparecem no site
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Controle de Exibição de Conteúdo Adulto */}
                            <div className="space-y-4 p-4 border-2 border-primary/20 rounded-lg bg-primary/5">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="flex-1 space-y-2">
                                        <Label htmlFor="showAdultContent" className="flex items-center gap-2 text-base font-semibold">
                                            <Eye className="h-5 w-5 text-primary" />
                                            Exibir Conteúdo Adulto
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            Controla a exibição do aviso de conteúdo adulto ao abrir o site e o Menu de Conteúdo no hambúrguer.
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-3 sm:self-start">
                                        <input
                                            type="checkbox"
                                            id="showAdultContent"
                                            checked={settings.showAdultContent ?? true}
                                            onChange={(e) => handleInputChange('showAdultContent', e.target.checked)}
                                            className="w-5 h-5 cursor-pointer"
                                        />
                                        <Label htmlFor="showAdultContent" className="text-sm font-medium cursor-pointer">
                                            {settings.showAdultContent ?? true ? '✅ Sim' : '❌ Não'}
                                        </Label>
                                    </div>
                                </div>

                                <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
                                    <p className="text-xs font-medium text-amber-900 dark:text-amber-100 mb-2">📋 O que será afetado:</p>
                                    <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
                                        <li>• <strong>Se SIM:</strong> Aviso adulto aparece ao abrir o site + Menu de Conteúdo visível</li>
                                        <li>• <strong>Se NÃO:</strong> Aviso adulto não aparece + Menu de Conteúdo oculto</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="space-y-2" id="fetish-menu">
                                <Label htmlFor="adultWorkLabel" className="flex items-center gap-2">
                                    <EyeOff className="h-4 w-4" />
                                    Texto do Aviso de Conteúdo Adulto
                                </Label>
                                <Input
                                    id="adultWorkLabel"
                                    value={settings.adultWorkLabel || "+18 ADULT WORK"}
                                    onChange={(e) => handleInputChange('adultWorkLabel', e.target.value)}
                                    placeholder="+18 ADULT WORK"
                                    className="font-bold"
                                    disabled={!settings.showAdultContent}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Este texto aparece no menu lateral do site como aviso de conteúdo adulto.
                                    {!settings.showAdultContent && ' (Desabilitado - ative "Exibir Conteúdo Adulto" acima)'}
                                </p>
                            </div>


                            <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                <h4 className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-2">💡 Exemplos de textos:</h4>
                                <div className="space-y-2">
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleInputChange('adultWorkLabel', 'CONTEÚDO EXCLUSIVO')}
                                            className="text-xs"
                                        >
                                            CONTEÚDO EXCLUSIVO
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleInputChange('adultWorkLabel', 'PREMIUM CONTENT')}
                                            className="text-xs"
                                        >
                                            PREMIUM CONTENT
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleInputChange('adultWorkLabel', 'ÁREA RESTRITA')}
                                            className="text-xs"
                                        >
                                            ÁREA RESTRITA
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleInputChange('adultWorkLabel', 'EXCLUSIVE ACCESS')}
                                            className="text-xs"
                                        >
                                            EXCLUSIVE ACCESS
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleInputChange('adultWorkLabel', 'MEMBERS ONLY')}
                                            className="text-xs"
                                        >
                                            MEMBERS ONLY
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleInputChange('adultWorkLabel', 'CONTEÚDO ESPECIAL')}
                                            className="text-xs"
                                        >
                                            CONTEÚDO ESPECIAL
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Twitter */}
                            <div className="space-y-3 p-4 border rounded-lg">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-2">
                                        <Twitter className="h-5 w-5" />
                                        <Label className="text-base font-semibold">Twitter</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="showTwitter"
                                            checked={settings.footerSettings?.showTwitter || false}
                                            onChange={(e) => handleNestedChange('footerSettings', 'showTwitter', e.target.checked)}
                                        />
                                        <Label htmlFor="showTwitter" className="text-sm">Mostrar no footer</Label>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="twitterUrl">URL do Twitter</Label>
                                    <Input
                                        id="twitterUrl"
                                        value={settings.footerSettings?.twitterUrl || ''}
                                        onChange={(e) => handleNestedChange('footerSettings', 'twitterUrl', e.target.value)}
                                        placeholder="https://twitter.com/seuusuario"
                                        disabled={!settings.footerSettings?.showTwitter}
                                    />
                                </div>
                            </div>

                            {/* Instagram */}
                            <div className="space-y-3 p-4 border rounded-lg">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-2">
                                        <Instagram className="h-5 w-5" />
                                        <Label className="text-base font-semibold">Instagram</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="showInstagram"
                                            checked={settings.footerSettings?.showInstagram || false}
                                            onChange={(e) => handleNestedChange('footerSettings', 'showInstagram', e.target.checked)}
                                        />
                                        <Label htmlFor="showInstagram" className="text-sm">Mostrar no footer</Label>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="instagramUrl">URL do Instagram</Label>
                                    <Input
                                        id="instagramUrl"
                                        value={settings.footerSettings?.instagramUrl || ''}
                                        onChange={(e) => handleNestedChange('footerSettings', 'instagramUrl', e.target.value)}
                                        placeholder="https://instagram.com/seuusuario"
                                        disabled={!settings.footerSettings?.showInstagram}
                                    />
                                </div>
                            </div>

                            {/* YouTube */}
                            <div className="space-y-3 p-4 border rounded-lg">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-2">
                                        <Youtube className="h-5 w-5" />
                                        <Label className="text-base font-semibold">YouTube</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="showYoutube"
                                            checked={settings.footerSettings?.showYoutube || false}
                                            onChange={(e) => handleNestedChange('footerSettings', 'showYoutube', e.target.checked)}
                                        />
                                        <Label htmlFor="showYoutube" className="text-sm">Mostrar no footer</Label>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="youtubeUrl">URL do YouTube</Label>
                                    <Input
                                        id="youtubeUrl"
                                        value={settings.footerSettings?.youtubeUrl || ''}
                                        onChange={(e) => handleNestedChange('footerSettings', 'youtubeUrl', e.target.value)}
                                        placeholder="https://youtube.com/@seucanal"
                                        disabled={!settings.footerSettings?.showYoutube}
                                    />
                                </div>
                            </div>

                            {/* WhatsApp */}
                            <div className="space-y-3 p-4 border rounded-lg">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-2">
                                        <MessageCircle className="h-5 w-5" />
                                        <Label className="text-base font-semibold">WhatsApp</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="showWhatsapp"
                                            checked={settings.footerSettings?.showWhatsapp || false}
                                            onChange={(e) => handleNestedChange('footerSettings', 'showWhatsapp', e.target.checked)}
                                        />
                                        <Label htmlFor="showWhatsapp" className="text-sm">Mostrar no footer</Label>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="whatsappUrl">URL do WhatsApp</Label>
                                    <Input
                                        id="whatsappUrl"
                                        value={settings.footerSettings?.whatsappUrl || ''}
                                        onChange={(e) => handleNestedChange('footerSettings', 'whatsappUrl', e.target.value)}
                                        placeholder="https://wa.me/5521999999999"
                                        disabled={!settings.footerSettings?.showWhatsapp}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        💡 Dica: Use o formato https://wa.me/NUMERO (ex: https://wa.me/5521990479104)
                                    </p>
                                </div>
                            </div>

                            {/* Telegram */}
                            <div className="space-y-3 p-4 border rounded-lg">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-2">
                                        <Send className="h-5 w-5" />
                                        <Label className="text-base font-semibold">Telegram</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="showTelegram"
                                            checked={settings.footerSettings?.showTelegram || false}
                                            onChange={(e) => handleNestedChange('footerSettings', 'showTelegram', e.target.checked)}
                                        />
                                        <Label htmlFor="showTelegram" className="text-sm">Mostrar no footer</Label>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="telegramUrl">URL do Telegram</Label>
                                    <Input
                                        id="telegramUrl"
                                        value={settings.footerSettings?.telegramUrl || ''}
                                        onChange={(e) => handleNestedChange('footerSettings', 'telegramUrl', e.target.value)}
                                        placeholder="https://t.me/seuusuario"
                                        disabled={!settings.footerSettings?.showTelegram}
                                    />
                                </div>
                            </div>

                            {/* Facebook */}
                            <div className="space-y-3 p-4 border rounded-lg">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-2">
                                        <Facebook className="h-5 w-5" />
                                        <Label className="text-base font-semibold">Facebook</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="showFacebook"
                                            checked={settings.footerSettings?.showFacebook || false}
                                            onChange={(e) => handleNestedChange('footerSettings', 'showFacebook', e.target.checked)}
                                        />
                                        <Label htmlFor="showFacebook" className="text-sm">Mostrar no footer</Label>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="facebookUrl">URL do Facebook</Label>
                                    <Input
                                        id="facebookUrl"
                                        value={settings.footerSettings?.facebookUrl || ''}
                                        onChange={(e) => handleNestedChange('footerSettings', 'facebookUrl', e.target.value)}
                                        placeholder="https://facebook.com/seuusuario"
                                        disabled={!settings.footerSettings?.showFacebook}
                                    />
                                </div>
                            </div>

                            {/* WhatsApp and Live Chat Floating Buttons */}
                            <div className="space-y-4 p-4 border-2 border-primary/20 rounded-lg bg-primary/5">
                                <h4 className="text-base font-semibold flex items-center gap-2">
                                    <MessageCircle className="h-5 w-5 text-primary" />
                                    Botões Flutuantes
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Configure os botões flutuantes que aparecem no site
                                </p>

                                <div className="flex items-center justify-between p-4 bg-card/50 rounded-xl border border-border">
                                    <div className="flex flex-col gap-1">
                                        <Label htmlFor="showWhatsappButton" className="text-sm font-semibold cursor-pointer">
                                            Exibir Balão do WhatsApp
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Ativa ou desativa o botão flutuante do WhatsApp no site
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <input
                                            type="checkbox"
                                            id="showWhatsappButton"
                                            checked={settings.showWhatsappButton ?? true}
                                            onChange={(e) => handleInputChange('showWhatsappButton', e.target.checked)}
                                            className="w-5 h-5 cursor-pointer"
                                        />
                                        <Label htmlFor="showWhatsappButton" className="text-sm font-medium cursor-pointer">
                                            {settings.showWhatsappButton ?? true ? '✅ Ativo' : '❌ Inativo'}
                                        </Label>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-card/50 rounded-xl border border-border">
                                    <div className="flex flex-col gap-1">
                                        <Label htmlFor="showLiveChatButton" className="text-sm font-semibold cursor-pointer">
                                            Exibir Botão Live Chat
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Ativa ou desativa o botão flutuante do Live Chat no site
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <input
                                            type="checkbox"
                                            id="showLiveChatButton"
                                            checked={settings.showLiveChatButton ?? true}
                                            onChange={(e) => handleInputChange('showLiveChatButton', e.target.checked)}
                                            className="w-5 h-5 cursor-pointer"
                                        />
                                        <Label htmlFor="showLiveChatButton" className="text-sm font-medium cursor-pointer">
                                            {settings.showLiveChatButton ?? true ? '✅ Ativo' : '❌ Inativo'}
                                        </Label>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                                <h4 className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">🔗 Configurações do Footer:</h4>
                                <ul className="text-xs text-green-800 dark:text-green-200 space-y-1">
                                    <li>• Marque as caixas para mostrar os ícones no footer do site</li>
                                    <li>• Configure as URLs para onde os ícones devem redirecionar</li>
                                    <li>• Apenas ícones marcados como &quot;Mostrar no footer&quot; aparecerão</li>
                                    <li>• As mudanças são aplicadas imediatamente após salvar</li>
                                    <li>• URLs inválidas podem quebrar os links - teste sempre!</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* <TabsContent value="social" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Instagram className="h-5 w-5" />
                                Redes Sociais
                            </CardTitle>
                            <CardDescription>
                                Links e usuários das suas redes sociais
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                    💡 <strong>Dica:</strong> Clique nos campos abaixo para editar os links das suas redes sociais. 
                                    As mudanças serão salvas quando você clicar em "Salvar Alterações".
                                </p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="instagram" className="flex items-center gap-2">
                                        <Instagram className="h-4 w-4" />
                                        Instagram
                                    </Label>
                                    <Input
                                        id="instagram"
                                        value={settings.socialMedia?.instagram || ''}
                                        onChange={(e) => handleNestedChange('socialMedia', 'instagram', e.target.value)}
                                        placeholder="@seuusuario"
                                        className="focus:ring-2 focus:ring-blue-500"
                                    />
                                    <p className="text-xs text-muted-foreground">Ex: @seuusuario</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="twitter" className="flex items-center gap-2">
                                        <Twitter className="h-4 w-4" />
                                        Twitter/X
                                    </Label>
                                    <Input
                                        id="twitter"
                                        value={settings.socialMedia?.twitter || ''}
                                        onChange={(e) => handleNestedChange('socialMedia', 'twitter', e.target.value)}
                                        placeholder="@seuusuario"
                                        className="focus:ring-2 focus:ring-blue-500"
                                    />
                                    <p className="text-xs text-muted-foreground">Ex: @seuusuario</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="youtube" className="flex items-center gap-2">
                                        <Youtube className="h-4 w-4" />
                                        YouTube
                                    </Label>
                                    <Input
                                        id="youtube"
                                        value={settings.socialMedia?.youtube || ''}
                                        onChange={(e) => handleNestedChange('socialMedia', 'youtube', e.target.value)}
                                        placeholder="Nome do canal"
                                        className="focus:ring-2 focus:ring-blue-500"
                                    />
                                    <p className="text-xs text-muted-foreground">Ex: ItaloProfissional</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="whatsappSocial" className="flex items-center gap-2">
                                        <MessageCircle className="h-4 w-4" />
                                        WhatsApp
                                    </Label>
                                    <Input
                                        id="whatsappSocial"
                                        value={settings.socialMedia?.whatsapp || ''}
                                        onChange={(e) => handleNestedChange('socialMedia', 'whatsapp', e.target.value)}
                                        placeholder="5521999999999"
                                        className="focus:ring-2 focus:ring-blue-500"
                                    />
                                    <p className="text-xs text-muted-foreground">Ex: 5521990479104</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="telegram" className="flex items-center gap-2">
                                        <MessageCircle className="h-4 w-4" />
                                        Telegram
                                    </Label>
                                    <Input
                                        id="telegram"
                                        value={settings.socialMedia?.telegram || ''}
                                        onChange={(e) => handleNestedChange('socialMedia', 'telegram', e.target.value)}
                                        placeholder="@seuusuario"
                                        className="focus:ring-2 focus:ring-blue-500"
                                    />
                                    <p className="text-xs text-muted-foreground">Ex: @seuusuario</p>
                                </div>
                            </div>
                            
                            <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-green-800 dark:text-green-200">
                                        ✅ <strong>Status:</strong> Todos os campos estão funcionando corretamente. 
                                        Você pode editar qualquer campo acima e clicar em "Salvar Alterações" para aplicar as mudanças.
                                    </p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            toast({
                                                title: "Estado das Redes Sociais",
                                                description: `Instagram: ${settings.socialMedia?.instagram || 'não configurado'}\nTwitter: ${settings.socialMedia?.twitter || 'não configurado'}\nYouTube: ${settings.socialMedia?.youtube || 'não configurado'}\nWhatsApp: ${settings.socialMedia?.whatsapp || 'não configurado'}\nTelegram: ${settings.socialMedia?.telegram || 'não configurado'}`,
                                            });
                                        }}
                                        className="text-xs"
                                    >
                                        🔍 Ver Estado Atual
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent> */}

                <TabsContent value="images" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Imagens do Perfil</CardTitle>
                            <CardDescription>Atualize a foto de perfil e a imagem de capa.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="profilePicture" className="flex items-center gap-2"><ImageIcon /> URL da Foto de Perfil</Label>
                                <Input id="profilePicture" placeholder="https://.../sua-foto.jpg" value={settings.profilePictureUrl} onChange={(e) => handleInputChange('profilePictureUrl', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="coverPhoto" className="flex items-center gap-2"><ImageIcon /> URL da Foto de Capa</Label>
                                <Input id="coverPhoto" placeholder="https://.../sua-capa.jpg" value={settings.coverPhotoUrl} onChange={(e) => handleInputChange('coverPhotoUrl', e.target.value)} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <ImageIcon className="h-5 w-5" />
                                        Galerias da Página Inicial
                                    </CardTitle>
                                    <CardDescription>
                                        Gerencie as 7 galerias de fotos que aparecem no rodapé da página inicial.
                                        Apenas galerias com fotos configuradas serão exibidas.
                                    </CardDescription>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center gap-2"
                                    asChild
                                >
                                    <a href="/" target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-4 w-4" />
                                        Ver no Site
                                    </a>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {settings.galleryPhotos.map((photo, index) => {
                                const galleryName = settings.galleryNames?.[index] || `Galeria ${index + 1}`;

                                return (
                                    <div key={`gallery-${index}`} className="space-y-3 p-4 border rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor={`gallery-${index}`} className="text-sm font-medium">
                                                Galeria {index + 1}: {galleryName}
                                            </Label>
                                            {photo.url && photo.url !== '/placeholder-photo.svg' && (
                                                <span className="text-xs text-green-600 font-medium">✓ Configurada</span>
                                            )}
                                        </div>

                                        {/* Campo para editar o nome da galeria */}
                                        <div className="space-y-2">
                                            <Label htmlFor={`gallery-name-${index}`} className="text-xs text-muted-foreground">
                                                Nome da Galeria
                                            </Label>
                                            <Input
                                                id={`gallery-name-${index}`}
                                                placeholder="Nome da galeria"
                                                value={galleryName}
                                                onChange={(e) => handleGalleryNameChange(index, e.target.value)}
                                                className="text-sm"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor={`gallery-${index}`} className="text-xs text-muted-foreground">
                                                URL da Imagem
                                            </Label>
                                            <Input
                                                id={`gallery-${index}`}
                                                placeholder={`URL da imagem para "${galleryName}"`}
                                                value={photo.url}
                                                onChange={(e) => handleGalleryChange(index, e.target.value)}
                                            />
                                        </div>

                                        {/* Preview da imagem */}
                                        {photo.url && photo.url !== '/placeholder-photo.svg' && (
                                            <div className="flex items-center gap-3 p-2 bg-muted/50 rounded">
                                                <Image
                                                    src={photo.url}
                                                    alt={`Preview Galeria ${index + 1}`}
                                                    width={64}
                                                    height={96}
                                                    className="w-16 h-24 object-cover rounded border"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                    }}
                                                    unoptimized
                                                />
                                                <div className="text-xs text-muted-foreground">
                                                    <p>Preview da imagem</p>
                                                    <p className="text-green-600">✓ URL válida</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">💡 Dicas:</h4>
                                <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                                    <li>• Use URLs de imagens hospedadas (Firebase Storage, CDN, etc.)</li>
                                    <li>• Formato recomendado: 400x800px (9:16) para melhor visualização</li>
                                    <li>• Apenas galerias com fotos válidas aparecerão no site</li>
                                    <li>• As mudanças aparecem automaticamente na página inicial</li>
                                </ul>
                            </div>
                        </CardContent >
                    </Card >
                </TabsContent >

                <TabsContent value="reviews" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Star className="h-5 w-5" />
                                Configurações de Avaliações
                            </CardTitle>
                            <CardDescription>
                                Gerencie como as avaliações são exibidas e moderadas
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="showReviews"
                                    checked={settings.reviewSettings?.showReviews || false}
                                    onChange={(e) => handleNestedChange('reviewSettings', 'showReviews', e.target.checked)}
                                />
                                <Label htmlFor="showReviews">Exibir avaliações publicamente</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="moderateReviews"
                                    checked={settings.reviewSettings?.moderateReviews || false}
                                    onChange={(e) => handleNestedChange('reviewSettings', 'moderateReviews', e.target.checked)}
                                />
                                <Label htmlFor="moderateReviews">Moderar avaliações antes de publicar</Label>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="defaultReviewMessage">Mensagem padrão de resposta</Label>
                                <Textarea
                                    id="defaultReviewMessage"
                                    value={settings.reviewSettings?.defaultReviewMessage || ''}
                                    onChange={(e) => handleNestedChange('reviewSettings', 'defaultReviewMessage', e.target.value)}
                                    placeholder="Mensagem automática enviada após avaliação..."
                                    rows={3}
                                />
                            </div>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="sendReviewToSecretChat"
                                    checked={settings.reviewSettings?.sendReviewToSecretChat ?? true}
                                    onChange={(e) => handleNestedChange('reviewSettings', 'sendReviewToSecretChat', e.target.checked)}
                                />
                                <Label htmlFor="sendReviewToSecretChat">Enviar avaliação para o chat secreto</Label>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="payment" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5" />
                                Configurações de Pagamento PIX
                            </CardTitle>
                            <CardDescription>
                                Configure o valor para pagamentos PIX via Mercado Pago
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <CreditCard className="h-5 w-5 text-green-600" />
                                    <Label htmlFor="pixValue" className="text-base font-semibold">
                                        Valor do PIX (R$)
                                    </Label>
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-gray-500 text-lg font-medium">R$</span>
                                    </div>
                                    <Input
                                        id="pixValue"
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        max="10000"
                                        value={settings.paymentSettings?.pixValue || 99.00}
                                        onChange={(e) => handleNestedChange('paymentSettings', 'pixValue', parseFloat(e.target.value) || 99.00)}
                                        placeholder="99.00"
                                        className="pl-12 text-lg font-medium h-12 border-2 focus:border-green-500 focus:ring-green-500"
                                    />
                                </div>

                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span>Valor padrão para pagamentos PIX via Mercado Pago</span>
                                </div>

                                <div className="grid grid-cols-3 gap-2 mt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleNestedChange('paymentSettings', 'pixValue', 49.90)}
                                        className="text-xs"
                                    >
                                        R$ 49,90
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleNestedChange('paymentSettings', 'pixValue', 99.00)}
                                        className="text-xs"
                                    >
                                        R$ 99,00
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleNestedChange('paymentSettings', 'pixValue', 199.00)}
                                        className="text-xs"
                                    >
                                        R$ 199,00
                                    </Button>
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                                <h4 className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">💡 Informações:</h4>
                                <ul className="text-xs text-green-800 dark:text-green-200 space-y-1">
                                    <li>• O valor do PIX será usado em todos os pagamentos</li>
                                    <li>• Os pagamentos são processados pelo Mercado Pago</li>
                                    <li>• As mudanças são aplicadas imediatamente</li>
                                    <li>• Teste sempre após alterar as configurações</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="appearance" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Palette className="h-5 w-5" />
                                Personalização Visual
                            </CardTitle>
                            <CardDescription>
                                Escolha as cores dos botões, o neon do fundo e a fonte do perfil.
                            </CardDescription>
                            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                <span className="text-xs text-muted-foreground">
                                    A preview abre automaticamente como modal flutuante nesta aba.
                                </span>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsAppearancePreviewOpen(true)}
                                    className="ml-auto"
                                >
                                    <Monitor className="mr-2 h-4 w-4" />
                                    Abrir preview flutuante
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap items-center justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleApplyAppearanceTemplate('feminino')}
                                >
                                    Template feminino
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleApplyAppearanceTemplate('masculino')}
                                >
                                    Template masculino
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleApplyAppearanceTemplate('ios')}
                                >
                                    Template iOS
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleRestoreDefaultColors}
                                >
                                    Restaurar padrão de cores
                                </Button>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="textColor" className="flex items-center gap-2">Cor das letras</Label>
                                        <div className="flex items-center gap-3">
                                            <Input
                                                id="textColor"
                                                type="color"
                                                value={settings.appearanceSettings?.textColor || '#ffffff'}
                                                onChange={(e) => handleNestedChange('appearanceSettings', 'textColor', e.target.value)}
                                                className="h-10 w-14 p-1"
                                            />
                                            <Input
                                                type="text"
                                                value={settings.appearanceSettings?.textColor || '#ffffff'}
                                                onChange={(e) => handleNestedChange('appearanceSettings', 'textColor', e.target.value)}
                                                placeholder="#ffffff"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="numberColor" className="flex items-center gap-2">Cor dos numeros</Label>
                                        <div className="flex items-center gap-3">
                                            <Input
                                                id="numberColor"
                                                type="color"
                                                value={settings.appearanceSettings?.numberColor || '#ffffff'}
                                                onChange={(e) => handleNestedChange('appearanceSettings', 'numberColor', e.target.value)}
                                                className="h-10 w-14 p-1"
                                            />
                                            <Input
                                                type="text"
                                                value={settings.appearanceSettings?.numberColor || '#ffffff'}
                                                onChange={(e) => handleNestedChange('appearanceSettings', 'numberColor', e.target.value)}
                                                placeholder="#ffffff"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="buttonColor" className="flex items-center gap-2">Cor dos botoes</Label>
                                        <div className="flex items-center gap-3">
                                            <Input
                                                id="buttonColor"
                                                type="color"
                                                value={settings.appearanceSettings?.buttonColor || '#ffffff'}
                                                onChange={(e) => handleNestedChange('appearanceSettings', 'buttonColor', e.target.value)}
                                                className="h-10 w-14 p-1"
                                            />
                                            <Input
                                                type="text"
                                                value={settings.appearanceSettings?.buttonColor || '#ffffff'}
                                                onChange={(e) => handleNestedChange('appearanceSettings', 'buttonColor', e.target.value)}
                                                placeholder="#ffffff"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="buttonTextColor" className="flex items-center gap-2">Cor do texto dos botoes</Label>
                                        <div className="flex items-center gap-3">
                                            <Input
                                                id="buttonTextColor"
                                                type="color"
                                                value={settings.appearanceSettings?.buttonTextColor || '#000000'}
                                                onChange={(e) => handleNestedChange('appearanceSettings', 'buttonTextColor', e.target.value)}
                                                className="h-10 w-14 p-1"
                                            />
                                            <Input
                                                type="text"
                                                value={settings.appearanceSettings?.buttonTextColor || '#000000'}
                                                onChange={(e) => handleNestedChange('appearanceSettings', 'buttonTextColor', e.target.value)}
                                                placeholder="#000000"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="lineColor" className="flex items-center gap-2">Cor das linhas</Label>
                                        <div className="flex items-center gap-3">
                                            <Input
                                                id="lineColor"
                                                type="color"
                                                value={settings.appearanceSettings?.lineColor || '#4b5563'}
                                                onChange={(e) => handleNestedChange('appearanceSettings', 'lineColor', e.target.value)}
                                                className="h-10 w-14 p-1"
                                            />
                                            <Input
                                                type="text"
                                                value={settings.appearanceSettings?.lineColor || '#4b5563'}
                                                onChange={(e) => handleNestedChange('appearanceSettings', 'lineColor', e.target.value)}
                                                placeholder="#4b5563"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="neonGlowColor" className="flex items-center gap-2">Cor do efeito neon</Label>
                                        <div className="flex items-center gap-3">
                                            <Input
                                                id="neonGlowColor"
                                                type="color"
                                                value={settings.appearanceSettings?.neonGlowColor || '#ffffff'}
                                                onChange={(e) => handleNestedChange('appearanceSettings', 'neonGlowColor', e.target.value)}
                                                className="h-10 w-14 p-1"
                                            />
                                            <Input
                                                type="text"
                                                value={settings.appearanceSettings?.neonGlowColor || '#ffffff'}
                                                onChange={(e) => handleNestedChange('appearanceSettings', 'neonGlowColor', e.target.value)}
                                                placeholder="#ffffff"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="containerColor" className="flex items-center gap-2">Cor dos containers</Label>
                                        <div className="flex items-center gap-3">
                                            <Input
                                                id="containerColor"
                                                type="color"
                                                value={settings.appearanceSettings?.containerColor || '#111111'}
                                                onChange={(e) => handleNestedChange('appearanceSettings', 'containerColor', e.target.value)}
                                                className="h-10 w-14 p-1"
                                            />
                                            <Input
                                                type="text"
                                                value={settings.appearanceSettings?.containerColor || '#111111'}
                                                onChange={(e) => handleNestedChange('appearanceSettings', 'containerColor', e.target.value)}
                                                placeholder="#111111"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="backgroundColor" className="flex items-center gap-2">Cor do fundo</Label>
                                        <div className="flex items-center gap-3">
                                            <Input
                                                id="backgroundColor"
                                                type="color"
                                                value={settings.appearanceSettings?.backgroundColor || '#000000'}
                                                onChange={(e) => handleNestedChange('appearanceSettings', 'backgroundColor', e.target.value)}
                                                className="h-10 w-14 p-1"
                                            />
                                            <Input
                                                type="text"
                                                value={settings.appearanceSettings?.backgroundColor || '#000000'}
                                                onChange={(e) => handleNestedChange('appearanceSettings', 'backgroundColor', e.target.value)}
                                                placeholder="#000000"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="iconColor" className="flex items-center gap-2">Cor dos icones</Label>
                                        <div className="flex items-center gap-3">
                                            <Input
                                                id="iconColor"
                                                type="color"
                                                value={settings.appearanceSettings?.iconColor || '#ffffff'}
                                                onChange={(e) => handleNestedChange('appearanceSettings', 'iconColor', e.target.value)}
                                                className="h-10 w-14 p-1"
                                            />
                                            <Input
                                                type="text"
                                                value={settings.appearanceSettings?.iconColor || '#ffffff'}
                                                onChange={(e) => handleNestedChange('appearanceSettings', 'iconColor', e.target.value)}
                                                placeholder="#ffffff"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="userSidebarIconColor" className="flex items-center gap-2">Cor dos icones do sidebar (usuario)</Label>
                                        <div className="flex items-center gap-3">
                                            <Input
                                                id="userSidebarIconColor"
                                                type="color"
                                                value={settings.appearanceSettings?.userSidebarIconColor || '#ffffff'}
                                                onChange={(e) => handleNestedChange('appearanceSettings', 'userSidebarIconColor', e.target.value)}
                                                className="h-10 w-14 p-1"
                                            />
                                            <Input
                                                type="text"
                                                value={settings.appearanceSettings?.userSidebarIconColor || '#ffffff'}
                                                onChange={(e) => handleNestedChange('appearanceSettings', 'userSidebarIconColor', e.target.value)}
                                                placeholder="#ffffff"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="adminSidebarIconColor" className="flex items-center gap-2">Cor dos icones do sidebar (admin)</Label>
                                        <div className="flex items-center gap-3">
                                            <Input
                                                id="adminSidebarIconColor"
                                                type="color"
                                                value={settings.appearanceSettings?.adminSidebarIconColor || '#ffffff'}
                                                onChange={(e) => handleNestedChange('appearanceSettings', 'adminSidebarIconColor', e.target.value)}
                                                className="h-10 w-14 p-1"
                                            />
                                            <Input
                                                type="text"
                                                value={settings.appearanceSettings?.adminSidebarIconColor || '#ffffff'}
                                                onChange={(e) => handleNestedChange('appearanceSettings', 'adminSidebarIconColor', e.target.value)}
                                                placeholder="#ffffff"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="secretChatColor" className="flex items-center gap-2">Cor do chat secreto</Label>
                                        <div className="flex items-center gap-3">
                                            <Input
                                                id="secretChatColor"
                                                type="color"
                                                value={settings.appearanceSettings?.secretChatColor || '#ffffff'}
                                                onChange={(e) => handleNestedChange('appearanceSettings', 'secretChatColor', e.target.value)}
                                                className="h-10 w-14 p-1"
                                            />
                                            <Input
                                                type="text"
                                                value={settings.appearanceSettings?.secretChatColor || '#ffffff'}
                                                onChange={(e) => handleNestedChange('appearanceSettings', 'secretChatColor', e.target.value)}
                                                placeholder="#ffffff"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="whatsappBubbleColor" className="flex items-center gap-2">Cor do balao do WhatsApp</Label>
                                        <div className="flex items-center gap-3">
                                            <Input
                                                id="whatsappBubbleColor"
                                                type="color"
                                                value={settings.appearanceSettings?.whatsappBubbleColor || '#000000'}
                                                onChange={(e) => handleNestedChange('appearanceSettings', 'whatsappBubbleColor', e.target.value)}
                                                className="h-10 w-14 p-1"
                                            />
                                            <Input
                                                type="text"
                                                value={settings.appearanceSettings?.whatsappBubbleColor || '#000000'}
                                                onChange={(e) => handleNestedChange('appearanceSettings', 'whatsappBubbleColor', e.target.value)}
                                                placeholder="#000000"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="iosHeaderBg" className="flex items-center gap-2">iOS: fundo da barra do cabecalho</Label>
                                        <div className="flex items-center gap-3">
                                            <Input
                                                id="iosHeaderBg"
                                                type="color"
                                                value={settings.appearanceSettings?.iosHeaderBg || '#e5e5ea'}
                                                onChange={(e) => handleNestedChange('appearanceSettings', 'iosHeaderBg', e.target.value)}
                                                className="h-10 w-14 p-1"
                                            />
                                            <Input
                                                type="text"
                                                value={settings.appearanceSettings?.iosHeaderBg || '#e5e5ea'}
                                                onChange={(e) => handleNestedChange('appearanceSettings', 'iosHeaderBg', e.target.value)}
                                                placeholder="#e5e5ea"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="iosHeaderBorder" className="flex items-center gap-2">iOS: borda da barra do cabecalho</Label>
                                        <div className="flex items-center gap-3">
                                            <Input
                                                id="iosHeaderBorder"
                                                type="color"
                                                value={settings.appearanceSettings?.iosHeaderBorder || '#c7c7cc'}
                                                onChange={(e) => handleNestedChange('appearanceSettings', 'iosHeaderBorder', e.target.value)}
                                                className="h-10 w-14 p-1"
                                            />
                                            <Input
                                                type="text"
                                                value={settings.appearanceSettings?.iosHeaderBorder || '#c7c7cc'}
                                                onChange={(e) => handleNestedChange('appearanceSettings', 'iosHeaderBorder', e.target.value)}
                                                placeholder="#c7c7cc"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="fontFamily" className="flex items-center gap-2">Tipo de letra</Label>
                                    <Input
                                        id="fontFamily"
                                        value={settings.appearanceSettings?.fontFamily || '"Times New Roman", Times, serif'}
                                        onChange={(e) => handleNestedChange('appearanceSettings', 'fontFamily', e.target.value)}
                                        placeholder='Ex: "Times New Roman", Times, serif'
                                    />
                                    <p className="text-xs text-muted-foreground">Use uma pilha de fontes CSS (ex: "Poppins", "Inter", sans-serif).</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="fontSizePx" className="flex items-center gap-2">Tamanho base da fonte (px)</Label>
                                    <Input
                                        id="fontSizePx"
                                        type="number"
                                        min={12}
                                        max={24}
                                        value={settings.appearanceSettings?.fontSizePx ?? 16}
                                        onChange={(e) => {
                                            const nextValue = Number(e.target.value);
                                            handleNestedChange('appearanceSettings', 'fontSizePx', Number.isFinite(nextValue) ? nextValue : 16);
                                        }}
                                    />
                                </div>

                                <div className="mt-4 p-3 rounded-lg border border-border/60 bg-muted/40">
                                    <p className="text-xs text-muted-foreground">Previa rapida:</p>
                                    <div
                                        className="mt-2 flex flex-wrap items-center gap-3 rounded-md border p-3"
                                        style={{
                                            backgroundColor: settings.appearanceSettings?.containerColor || '#111111',
                                            borderColor: settings.appearanceSettings?.lineColor || '#4b5563',
                                            color: settings.appearanceSettings?.textColor || '#ffffff',
                                            fontFamily: settings.appearanceSettings?.fontFamily || '"Times New Roman", Times, serif',
                                            boxShadow: `0 0 10px ${settings.appearanceSettings?.neonGlowColor || '#ffffff'}33`
                                        }}
                                    >
                                        <span className="text-sm font-semibold">Seu titulo com a fonte escolhida</span>
                                        <span className="text-sm" style={{ color: settings.appearanceSettings?.numberColor || '#ffffff' }}>R$ 99,00</span>
                                        <Star className="h-4 w-4" style={{ color: settings.appearanceSettings?.iconColor || '#ffffff' }} />
                                        <button
                                            type="button"
                                            className="px-3 py-1.5 rounded-md text-xs"
                                            style={{
                                                backgroundColor: settings.appearanceSettings?.buttonColor || '#ffffff',
                                                color: settings.appearanceSettings?.buttonTextColor || '#000000',
                                                boxShadow: `0 0 8px ${settings.appearanceSettings?.neonGlowColor || '#ffffff'}55`
                                            }}
                                        >
                                            Botao
                                        </button>
                                    </div>
                                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                                        <span className="text-muted-foreground">Sidebar usuario:</span>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="h-6 w-6 rounded-full border"
                                                style={{
                                                    backgroundColor: settings.appearanceSettings?.userSidebarIconColor || '#ffffff',
                                                    borderColor: settings.appearanceSettings?.lineColor || '#4b5563'
                                                }}
                                            />
                                            <span>Icones</span>
                                        </div>
                                        <span className="text-muted-foreground">Sidebar admin:</span>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="h-6 w-6 rounded-full border"
                                                style={{
                                                    backgroundColor: settings.appearanceSettings?.adminSidebarIconColor || '#ffffff',
                                                    borderColor: settings.appearanceSettings?.lineColor || '#4b5563'
                                                }}
                                            />
                                            <span>Icones</span>
                                        </div>
                                        <span className="text-muted-foreground">Chat secreto:</span>
                                        <div
                                            className="h-6 w-10 rounded-md border"
                                            style={{
                                                backgroundColor: settings.appearanceSettings?.secretChatColor || '#ffffff',
                                                borderColor: settings.appearanceSettings?.lineColor || '#4b5563'
                                            }}
                                        />
                                        <span className="text-muted-foreground">WhatsApp:</span>
                                        <div
                                            className="h-6 w-10 rounded-full border"
                                            style={{
                                                backgroundColor: settings.appearanceSettings?.whatsappBubbleColor || '#000000',
                                                borderColor: settings.appearanceSettings?.lineColor || '#4b5563'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="security" className="space-y-4">
                    <SecuritySettings />
                    <PasskeyManagement userId={user?.uid} />
                </TabsContent>
            </Tabs >

            <DraggablePreviewModal
                isOpen={isAppearancePreviewOpen}
                onClose={() => setIsAppearancePreviewOpen(false)}
                appearanceSettings={settings.appearanceSettings}
                name={settings.name}
                coverPhotoUrl={settings.coverPhotoUrl}
                profilePhotoUrl={settings.profilePictureUrl}
            />

        </div >
    );
}

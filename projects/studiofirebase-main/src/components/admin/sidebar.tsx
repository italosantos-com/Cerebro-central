
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Bell,
    Camera,
    Home,
    // LineChart,
    Package,
    Package2,
    ShoppingCart,
    Users,
    User,
    MessageSquare,
    LogOut,
    Image as ImageIcon,
    Video,
    Link2,
    Star,
    UploadCloud,
    // KeyRound,
    Settings,
    ThumbsUp,
    // Database,
    // Twitter,
    CreditCard,
    Crown,
    UserCog,
    Calendar,
    Brain,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { isSuperAdminUser } from "@/lib/superadmin-config";
import { useAdminProfile } from "@/hooks/use-admin-profile";
import { useToast } from "@/hooks/use-toast";

interface AdminSidebarProps {
    onLogout: () => void;
    onClose?: () => void;
}

export default function AdminSidebar({ onLogout, onClose }: AdminSidebarProps) {
        // Estado para submenu CONTEÚDO
        const [isConteudoExpanded, setIsConteudoExpanded] = useState(false);
        const [modalInfo, setModalInfo] = useState<string | null>(null);
        const openModalInfo = (info: string) => setModalInfo(info);
        const closeModalInfo = () => setModalInfo(null);
    const { toast } = useToast();
    const pathname = usePathname() ?? '';
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [notificationCounts, setNotificationCounts] = useState({
        messages: 0,
        reports: 0,
        subscribers: 0,
        fraudAlerts: 0,
        total: 0,
    });
    const [notificationsLoaded, setNotificationsLoaded] = useState(false);
    const { profile, loading: profileLoading } = useAdminProfile();
    const [profilePhotoOverride, setProfilePhotoOverride] = useState<string | null>(null);
    const [isSavingProfilePhoto, setIsSavingProfilePhoto] = useState(false);

    const slugMatch = pathname.match(/^\/([^\/]+)\/admin(\/.*)?$/);
    const cookieSlug = typeof document !== 'undefined'
        ? (document.cookie.split('; ').find((row) => row.startsWith('admin_slug='))?.split('=')[1] || null)
        : null;
    const decodedCookieSlug = cookieSlug ? decodeURIComponent(cookieSlug) : null;
    const adminSlug = slugMatch?.[1] || (pathname.startsWith('/admin') ? decodedCookieSlug : null);
    const normalizedAdminPath = slugMatch ? `/admin${slugMatch[2] ?? ''}` : pathname;

    const buildApiUrl = useCallback((path: string) => {
        if (typeof window === 'undefined') return path;
        return new URL(path, window.location.origin).toString();
    }, []);

    // Extract display name once to avoid duplication
    const adminDisplayName = profile.username || profile.name;

    // Helper to get admin display name with fallback
    const getAdminDisplayName = (fullText: boolean) => {
        if (adminDisplayName) return adminDisplayName;
        return fullText ? 'Admin Panel' : 'Admin';
    };

    // Helper to get avatar fallback initial
    const getAvatarFallback = () => {
        return (adminDisplayName?.[0] || 'A').toUpperCase();
    };

    const withAdminSlug = (href: string) => {
        if (!adminSlug) return href;
        return `/${adminSlug}${href}`;
    };

    const getAuthHeaders = useCallback(async () => {
        const user = auth.currentUser;
        if (!user) return {} as Record<string, string>;
        const token = await user.getIdToken();
        return { Authorization: `Bearer ${token}` } as Record<string, string>;
    }, []);

    useEffect(() => {
        setProfilePhotoOverride(profile.profilePictureUrl || null);
    }, [profile.profilePictureUrl]);

    const handleEditSidebarPhoto = useCallback(async (event?: React.MouseEvent) => {
        event?.preventDefault();
        event?.stopPropagation();

        const currentUser = auth.currentUser;
        if (!currentUser) {
            toast({
                variant: 'destructive',
                title: 'Login necessário',
                description: 'Entre com uma conta de admin para alterar a foto do sidebar.'
            });
            return;
        }

        const currentUrl = profilePhotoOverride || profile.profilePictureUrl || '';
        const nextUrlRaw = window.prompt(
            'Cole a URL da nova foto (urlUpload).\nDica: gere a URL em /admin/fotos.',
            currentUrl
        );

        if (nextUrlRaw === null) return;

        const nextUrl = nextUrlRaw.trim();
        if (!nextUrl) {
            toast({
                variant: 'destructive',
                title: 'URL inválida',
                description: 'Informe uma URL válida para salvar a foto.'
            });
            return;
        }

        const isValidUrl = nextUrl.startsWith('/') || nextUrl.startsWith('http://') || nextUrl.startsWith('https://');
        if (!isValidUrl) {
            toast({
                variant: 'destructive',
                title: 'Formato inválido',
                description: 'Use uma URL iniciando com http://, https:// ou /.'
            });
            return;
        }

        setIsSavingProfilePhoto(true);
        try {
            const headers = await getAuthHeaders();
            if (!headers.Authorization) {
                throw new Error('Token de autenticação ausente.');
            }

            const currentSettingsResponse = await fetch(`/api/admin/profile-settings?adminUid=${currentUser.uid}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...headers,
                }
            });

            if (!currentSettingsResponse.ok) {
                throw new Error('Não foi possível carregar as configurações atuais.');
            }

            const currentSettings = await currentSettingsResponse.json();
            const updatedSettings = {
                ...currentSettings,
                profilePictureUrl: nextUrl,
            };

            const saveResponse = await fetch('/api/admin/profile-settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...headers,
                },
                body: JSON.stringify({ settings: updatedSettings, adminUid: currentUser.uid }),
            });

            if (!saveResponse.ok) {
                const data = await saveResponse.json().catch(() => ({}));
                throw new Error(data?.message || 'Falha ao salvar a foto do sidebar.');
            }

            setProfilePhotoOverride(nextUrl);
            toast({
                title: 'Foto atualizada',
                description: 'A foto do sidebar foi atualizada com sucesso.'
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erro ao atualizar foto',
                description: error?.message || 'Não foi possível atualizar a foto do sidebar.'
            });
        } finally {
            setIsSavingProfilePhoto(false);
        }
    }, [getAuthHeaders, profile.profilePictureUrl, profilePhotoOverride, toast]);

    const openSidebarPhotoUpload = useCallback((event?: React.MouseEvent) => {
        event?.preventDefault();
        event?.stopPropagation();
        window.open(withAdminSlug('/admin/fotos'), '_blank', 'noopener,noreferrer');
    }, [withAdminSlug]);

    const fetchUnreadMessagesCount = useCallback(async () => {
        try {
            const headers = await getAuthHeaders();
            if (!headers.Authorization) return 0;
            const response = await fetch(buildApiUrl('/api/messages/conversations'), {
                headers,
                credentials: 'include',
            });
            const data = await response.json();
            if (!response.ok || !data?.success) {
                throw new Error(data?.message || 'Falha ao buscar conversas');
            }

            const conversations = Array.isArray(data.conversations) ? data.conversations : [];
            return conversations.reduce((sum: number, conversation: any) => {
                const unread = Number(conversation?.unreadCount || 0);
                return sum + (Number.isFinite(unread) ? unread : 0);
            }, 0);
        } catch (error) {
            console.warn('[AdminSidebar] Falha de rede ao buscar mensagens nao lidas. Mantendo contador atual.');
            return 0;
        }
    }, [buildApiUrl, getAuthHeaders]);

    const fetchServerSideCounts = useCallback(async () => {
        try {
            const headers = await getAuthHeaders();
            if (!headers.Authorization) {
                return { reports: 0, subscribers: 0, fraudAlerts: 0 };
            }

            const response = await fetch(buildApiUrl('/api/admin/sidebar/counts'), {
                headers,
                credentials: 'include',
            });

            const data = await response.json();
            if (!response.ok || !data?.success) {
                throw new Error(data?.message || 'Falha ao carregar contagens');
            }

            return {
                reports: Number(data?.data?.reports || 0),
                subscribers: Number(data?.data?.subscribers || 0),
                fraudAlerts: Number(data?.data?.fraudAlerts || 0),
            };
        } catch (error) {
            console.warn('[AdminSidebar] Falha de rede ao carregar contagens do painel. Mantendo valores atuais.');
            return { reports: 0, subscribers: 0, fraudAlerts: 0 };
        }
    }, [buildApiUrl, getAuthHeaders]);

    const refreshNotifications = useCallback(async () => {
        const [messages, counts] = await Promise.all([
            fetchUnreadMessagesCount(),
            fetchServerSideCounts(),
        ]);
        const reports = counts.reports;
        const subscribers = counts.subscribers;
        const fraudAlerts = counts.fraudAlerts;
        const total = messages + reports + subscribers + fraudAlerts;
        setNotificationCounts({ messages, reports, subscribers, fraudAlerts, total });
        setNotificationsLoaded(true);
    }, [fetchServerSideCounts, fetchUnreadMessagesCount]);

    const navLinks = useMemo(() => [
        { href: "/admin", label: "Dashboard", icon: Home },
        { href: "/admin/updates", label: "Feed", icon: Bell },
        { href: "/admin/conversations", label: "Conversas", icon: MessageSquare },
        { href: "/admin/fotos", label: "Fotos", icon: ImageIcon },
        { href: "/admin/videos", label: "Vídeos", icon: Video },
        { href: "/admin/uploads", label: "Uploads", icon: UploadCloud },
        { href: "/admin/products", label: "Loja", icon: Package },
        { href: "/admin/subscriptions", label: "Assinatura", icon: CreditCard },
        { href: "/admin/exclusive-content", label: "Conteúdo Exclusivo", icon: Crown },
        { href: "/admin/calendar", label: "Calendário", icon: Calendar },
        { href: "/admin/reviews", label: "Avaliações", icon: ThumbsUp },
        { href: "/admin/cerebro-central", label: "Cerebro Central IA", icon: Brain },
        { href: "/admin/settings", label: "Configurações", icon: Settings },
        { href: "/admin/admins", label: "Gerenciador de Admins", icon: UserCog },
        { href: "/admin/integrations", label: "Integrações", icon: Link2 },
        { href: "/admin/integrations/google", label: "Integração Google", icon: Link2 },
        { href: "/admin/integrations/apple", label: "Integração Apple", icon: Link2 },
    ], []);

    useEffect(() => {
        const loadAdminRole = async () => {
            const currentUser = auth.currentUser;
            if (!currentUser?.uid) {
                setIsSuperAdmin(false);
                return;
            }

            try {
                const adminDoc = await getDoc(doc(db, "admins", currentUser.uid));
                const adminData = adminDoc.exists() ? adminDoc.data() : {};
                const username = String(adminData.username ?? "").trim();
                const email = String(adminData.email ?? currentUser.email ?? "").trim();
                setIsSuperAdmin(isSuperAdminUser({ username, email }));
            } catch (error) {
                console.error("[AdminSidebar] Erro ao carregar perfil do admin:", error);
                setIsSuperAdmin(false);
            }
        };

        void loadAdminRole();
    }, []);

    useEffect(() => {
        let isActive = true;

        const load = async () => {
            if (!isActive) return;
            if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
            await refreshNotifications();
        };

        void load();
        const intervalId = setInterval(load, 30000);

        return () => {
            isActive = false;
            clearInterval(intervalId);
        };
    }, [refreshNotifications]);

    const visibleLinks = useMemo(() => {
        if (isSuperAdmin) return navLinks;
        return navLinks.filter((link) => link.href !== "/admin/admins");
    }, [isSuperAdmin, navLinks]);

    return (
        <div className="flex h-full max-h-screen flex-col gap-2 bg-sidebar glass-sidebar">
            <div className="flex h-14 items-center border-b border-sidebar-border px-4 lg:h-[60px] lg:px-6">
                <Link href={withAdminSlug("/admin")} className="flex items-center gap-3 font-semibold min-w-0">
                    {profileLoading ? (
                        <>
                            <Skeleton className="h-6 w-6 rounded-full" />
                            <span className="hidden sm:inline">
                                <Skeleton className="h-4 w-24" />
                            </span>
                            <span className="sm:hidden">
                                <Skeleton className="h-4 w-16" />
                            </span>
                        </>
                    ) : (
                        <>
                            {(profilePhotoOverride || profile.profilePictureUrl) ? (
                                <Avatar
                                    className="h-6 w-6 cursor-pointer"
                                    onClick={(event) => void handleEditSidebarPhoto(event)}
                                    title="Alterar foto do sidebar"
                                >
                                    <AvatarImage
                                        src={profilePhotoOverride || profile.profilePictureUrl || undefined}
                                        alt={getAdminDisplayName(true)}
                                    />
                                    <AvatarFallback className="text-xs bg-[hsl(var(--sidebar-primary))] text-white">
                                        {getAvatarFallback()}
                                    </AvatarFallback>
                                </Avatar>
                            ) : (
                                <button
                                    type="button"
                                    onClick={(event) => void handleEditSidebarPhoto(event)}
                                    title="Adicionar foto do sidebar"
                                    className="inline-flex"
                                >
                                    <Package2 className="h-6 w-6 text-[hsl(var(--sidebar-primary))]" strokeWidth={2.5} />
                                </button>
                            )}
                            <span className="hidden sm:inline text-sidebar-accent-foreground font-semibold">
                                {getAdminDisplayName(true)}
                            </span>
                            <span className="sm:hidden text-sidebar-accent-foreground font-semibold">
                                {getAdminDisplayName(false)}
                            </span>
                        </>
                    )}
                </Link>
                {!profileLoading && (
                    <div className="ml-2 flex items-center gap-1">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-sidebar-foreground/80 hover:text-sidebar-accent-foreground"
                            onClick={(event) => void handleEditSidebarPhoto(event)}
                            disabled={isSavingProfilePhoto}
                            title="Alterar foto"
                        >
                            {isSavingProfilePhoto ? <Skeleton className="h-3.5 w-3.5 rounded-full" /> : <Camera className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-sidebar-foreground/80 hover:text-sidebar-accent-foreground"
                            onClick={(event) => openSidebarPhotoUpload(event)}
                            title="Abrir URL upload"
                        >
                            <Link2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                )}
                <div className="ml-auto flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="relative h-8 w-8">
                                <Bell className="h-4 w-4" />
                                {notificationCounts.total > 0 && (
                                    <Badge
                                        variant="destructive"
                                        className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px]"
                                    >
                                        {notificationCounts.total > 99 ? '99+' : notificationCounts.total}
                                    </Badge>
                                )}
                                <span className="sr-only">Abrir notificacoes</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                            <DropdownMenuLabel>Notificacoes</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {notificationCounts.total === 0 ? (
                                <DropdownMenuItem disabled>
                                    {notificationsLoaded ? 'Sem novidades no momento.' : 'Carregando notificacoes...'}
                                </DropdownMenuItem>
                            ) : (
                                <>
                                    <DropdownMenuItem asChild className="cursor-pointer">
                                        <Link href={withAdminSlug('/admin/conversations')}>
                                            Mensagens nao lidas
                                            <span className="ml-auto text-xs font-semibold">
                                                {notificationCounts.messages}
                                            </span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild className="cursor-pointer">
                                        <Link href={withAdminSlug('/admin/subscriptions')}>
                                            Novas assinaturas (24h)
                                            <span className="ml-auto text-xs font-semibold">
                                                {notificationCounts.subscribers}
                                            </span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild className="cursor-pointer">
                                        <Link href={withAdminSlug('/admin/admins')}>
                                            Denuncias em aberto
                                            <span className="ml-auto text-xs font-semibold">
                                                {notificationCounts.reports}
                                            </span>
                                        </Link>
                                    </DropdownMenuItem>
                                    {notificationCounts.fraudAlerts > 0 && (
                                        <DropdownMenuItem asChild className="cursor-pointer">
                                            <Link
                                                href={withAdminSlug(
                                                    isSuperAdmin ? '/admin/admins' : '/admin/cerebro-central'
                                                )}
                                            >
                                                Alertas de fraude
                                                <span className="ml-auto text-xs font-semibold">
                                                    {notificationCounts.fraudAlerts}
                                                </span>
                                            </Link>
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        className="cursor-pointer"
                                        onSelect={(event) => {
                                            event.preventDefault();
                                            void refreshNotifications();
                                        }}
                                    >
                                        Atualizar agora
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    {onClose && (
                        <Button variant="outline" size="icon" className="h-8 w-8 md:hidden" onClick={onClose}>
                            <X className="h-4 w-4" />
                            <span className="sr-only">Close menu</span>
                        </Button>
                    )}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                    {visibleLinks.map((link) => {
                        const isActive =
                            link.href === "/admin"
                                ? normalizedAdminPath === "/admin"
                                : normalizedAdminPath.startsWith(link.href);

                        return (
                            <Link
                                key={link.href}
                                href={withAdminSlug(link.href)}
                                className={`menu-item mb-1 rounded-lg px-4 py-3 transition-all duration-200 ${
                                    isActive ? "menu-item-active" : "menu-item-inactive"
                                }`}
                            >
                                <link.icon className="h-5 w-5 flex-shrink-0" />
                                <span className="truncate">{link.label}</span>
                            </Link>
                        );
                    })}

                    {/* Menu CONTEÚDO - apenas categorias não adultas */}
                    <div className="mb-2">
                        <Link href={withAdminSlug("/admin/conteudo")} 
                              className={`flex items-center gap-4 rounded-lg px-4 py-3 transition-all duration-200 font-medium menu-item-inactive w-full text-left ${isConteudoExpanded ? 'bg-sidebar-accent/10' : ''}`}
                              onClick={() => setIsConteudoExpanded((v) => !v)}>
                            <Crown className="h-5 w-5 flex-shrink-0" />
                            <span className="truncate">Conteúdo</span>
                        </Link>
                        {isConteudoExpanded && (
                            <div className="ml-8 mt-2 flex flex-col gap-1">
                                <span className="font-semibold text-muted-foreground mt-3 mb-1">Saúde Sexual</span>
                                <button type="button" className="text-left px-2 py-1 rounded hover:bg-muted" onClick={() => openModalInfo('Consentimento e Limites')}>Consentimento e Limites</button>
                                <button type="button" className="text-left px-2 py-1 rounded hover:bg-muted" onClick={() => openModalInfo('Higiene e Cuidados')}>Higiene e Cuidados</button>
                                <button type="button" className="text-left px-2 py-1 rounded hover:bg-muted" onClick={() => openModalInfo('Prevenção de ISTs')}>Prevenção de ISTs</button>
                                <button type="button" className="text-left px-2 py-1 rounded hover:bg-muted" onClick={() => openModalInfo('Lubrificantes e Segurança')}>Lubrificantes e Segurança</button>
                                <span className="font-semibold text-muted-foreground mt-3 mb-1">Outros</span>
                                <button type="button" className="text-left px-2 py-1 rounded hover:bg-muted" onClick={() => openModalInfo('Findom (Dominação Financeira)')}>Findom (Dominação Financeira)</button>
                            </div>
                        )}
                    </div>
                </nav>
            </div>
            <div className="mt-auto p-4 border-t border-sidebar-border">
                            {/* Modal informativo Missão, Visão, Valores - modelo FetishModal */}
                            {modalInfo && (
                                    <Dialog open={!!modalInfo} onOpenChange={closeModalInfo}>
                                        <DialogContent className="sm:max-w-[600px] p-0 bg-card border-gray-400 shadow-lg">
                                            <ScrollArea className="max-h-[90vh]">
                                                <div className="relative h-64 w-full overflow-hidden">
                                                    <div className="absolute inset-0 bg-gray-900" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
                                                </div>
                                                <div className="p-6 pt-0 -mt-8 relative z-10">
                                                    <DialogHeader>
                                                        <DialogTitle className="text-2xl font-bold mb-2 text-white">{modalInfo}</DialogTitle>
                                                        <DialogDescription asChild>
                                                            <p className="text-base text-muted-foreground whitespace-pre-wrap">
                                                                {modalInfo === 'Missão' && 'Nossa missão é promover impacto positivo e transformação social por meio de tecnologia e educação.'}
                                                                {modalInfo === 'Visão' && 'Nossa visão é ser referência global em inovação, inclusão e sustentabilidade.'}
                                                                {modalInfo === 'Valores' && 'Nossos valores incluem ética, transparência, colaboração e compromisso com a comunidade.'}
                                                            </p>
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                </div>
                                            </ScrollArea>
                                        </DialogContent>
                                    </Dialog>
                            )}
                <Button
                    size="sm"
                    variant="outline"
                    className="w-full font-semibold border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all duration-200"
                    onClick={onLogout}
                >
                    <LogOut className="mr-2 h-4 w-4" strokeWidth={2} />
                    <span className="hidden sm:inline">Sair</span>
                    <span className="sm:hidden">Logout</span>
                </Button>
            </div>
        </div>
    );
}

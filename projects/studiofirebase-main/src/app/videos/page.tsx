
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Loader2, AlertCircle, Video, ExternalLink } from 'lucide-react';
import { processVideoUrl } from '@/utils/video-url-processor';
import { Button } from "@/components/ui/button";
import { useToast } from "../../hooks/use-toast";
import { collection, getDocs, Timestamp, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getPublicUsernameFromPathname } from '@/utils/public-admin-scope';
import { resolveAdminUidByUsername } from '@/utils/admin-lookup-client';
import { isSuperAdminUsername } from '@/lib/superadmin-config';

// Interfaces
interface UploadedVideo {
    id: string;
    title: string;
    videoUrl: string;
    thumbnailUrl?: string;
    createdAt: Timestamp;
}

// Reusable components
const FeedLoading = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">{message}</p>
    </div>
);

const FeedError = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-destructive bg-destructive/10 rounded-lg p-4">
        <AlertCircle className="h-12 w-12" />
        <p className="mt-4 font-semibold">Erro ao carregar</p>
        <p className="text-sm text-center">{message}</p>
    </div>
);

const FeedEmpty = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
        <Video className="h-12 w-12" />
        <p className="mt-4 text-lg font-semibold text-center">{message}</p>
    </div>
);

const UploadsFeed = () => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [videos, setVideos] = useState<UploadedVideo[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchVideos = async () => {
            setIsLoading(true);
            try {
                // Determinar adminUid com base no username da URL
                let adminUidFilter: string | null = null;
                if (typeof window !== 'undefined') {
                    const username = getPublicUsernameFromPathname(window.location.pathname);
                    if (username && !isSuperAdminUsername(username)) {
                        adminUidFilter = await resolveAdminUidByUsername(username);
                        if (!adminUidFilter) {
                            setVideos([]);
                            setIsLoading(false);
                            return;
                        }
                    }
                }

                const q = adminUidFilter
                    ? query(collection(db, "videos"), where('adminUid', '==', adminUidFilter), orderBy("createdAt", "desc"))
                    : query(collection(db, "videos"), orderBy("createdAt", "desc"));
                const querySnapshot = await getDocs(q);
                setVideos(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UploadedVideo)));
            } catch (e) {
                setError("Não foi possível carregar os vídeos do servidor.");
                toast({ variant: "destructive", title: "Erro ao Carregar Vídeos" });
            } finally {
                setIsLoading(false);
            }
        };
        fetchVideos();
    }, [toast]);

    if (isLoading) return <FeedLoading message="Carregando vídeos enviados..." />;
    if (error) return <FeedError message={error} />;
    if (videos.length === 0) return <FeedEmpty message="Nenhum vídeo foi enviado ainda." />;

    const IntelligentPlayer = ({ video }: { video: UploadedVideo }) => {
        const { platform, embedUrl, originalUrl } = processVideoUrl(video.videoUrl);
        const [videoError, setVideoError] = useState(false);
        const [renderMode, setRenderMode] = useState<'video' | 'iframe' | 'options'>('video');

        // Detectar se é Google Photos ou iCloud
        const isGooglePhotos = video.videoUrl.toLowerCase().includes('photos.google.com') ||
            video.videoUrl.toLowerCase().includes('photos.app.goo.gl') ||
            video.videoUrl.toLowerCase().includes('googleusercontent.com');
        const isICloud = video.videoUrl.toLowerCase().includes('icloud.com');
        const needsSpecialHandling = isGooglePhotos || isICloud;

        // YouTube, Vimeo, Dailymotion sempre usam embed
        if (['youtube', 'vimeo', 'dailymotion'].includes(platform)) {
            return <iframe src={embedUrl} className="w-full aspect-video" frameBorder="0" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title={video.title} loading="lazy" />;
        }

        // Se houver erro, mostrar opções
        if (videoError || renderMode === 'options') {
            return (
                <div className="bg-gray-900 flex flex-col items-center justify-center p-4 aspect-video">
                    <p className="text-white text-sm mb-2">
                        {needsSpecialHandling ? '🔒 Vídeo de serviço externo' : 'Erro ao carregar vídeo'}
                    </p>
                    <p className="text-gray-400 text-xs mb-4 text-center px-4">
                        {isGooglePhotos && 'Google Photos não permite embed em localhost/iframe'}
                        {isICloud && 'iCloud não permite embed direto'}
                        {!needsSpecialHandling && 'Erro ao carregar o vídeo'}
                    </p>
                    <div className="space-y-2 w-full max-w-xs">
                        <Button
                            onClick={() => window.open(video.videoUrl, '_blank')}
                            variant="default"
                            size="sm"
                            className="w-full"
                        >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            {needsSpecialHandling ? 'Abrir no Navegador' : 'Abrir Link Original'}
                        </Button>
                        <Button
                            onClick={() => { setVideoError(false); setRenderMode('iframe'); }}
                            variant="secondary"
                            size="sm"
                            className="w-full"
                        >
                            🖼️ Tentar em Iframe
                        </Button>
                        {!needsSpecialHandling && (
                            <Button
                                onClick={() => { setVideoError(false); setRenderMode('video'); }}
                                variant="secondary"
                                size="sm"
                                className="w-full"
                            >
                                🔄 Tentar Novamente
                            </Button>
                        )}
                    </div>
                    {isGooglePhotos && (
                        <p className="text-xs text-blue-400 mt-3 text-center px-4">
                            💡 Em produção, o vídeo será convertido automaticamente
                        </p>
                    )}
                </div>
            );
        }

        if (renderMode === 'iframe') {
            return (
                <iframe
                    src={originalUrl}
                    className="w-full aspect-video"
                    frameBorder="0"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    title={video.title}
                    loading="lazy"
                />
            );
        }

        // HTML5 player padrão com URL processada
        return (
            <video
                src={originalUrl}
                poster={video.thumbnailUrl}
                className="w-full aspect-video object-contain bg-black"
                controls
                preload="metadata"
                onError={() => { setVideoError(true); setRenderMode('options'); }}
                playsInline
                controlsList="nodownload"
                crossOrigin="anonymous"
            />
        );
    };

    return (
        <div className="flex flex-col gap-6">
            {videos.map(video => (
                <div key={video.id} className="group relative w-full overflow-hidden rounded-lg border border-primary/20 hover:border-primary hover:shadow-neon-red-light transition-all">
                    <IntelligentPlayer video={video} />
                    <div className="p-4 bg-card border-t border-primary/20">
                        <h3 className="text-lg font-semibold text-foreground">{video.title}</h3>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function VideosPage() {
    return (
        <main className="flex flex-1 w-full flex-col items-center p-4 bg-background">
            <Card className="w-full max-w-6xl animate-in fade-in-0 zoom-in-95 duration-500 shadow-neon-red-strong border-primary/50 bg-card/90 backdrop-blur-xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl text-white text-shadow-neon-red-light flex items-center justify-center gap-3">
                        <Video /> Galeria de Vídeos
                    </CardTitle>
                    <CardDescription className="text-lg text-muted-foreground">
                        Vídeos enviados por upload.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <UploadsFeed />
                </CardContent>
            </Card>
        </main>
    );
}

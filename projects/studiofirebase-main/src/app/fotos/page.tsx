
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Loader2, AlertCircle, Camera, Maximize2 } from 'lucide-react';
import Image from "next/image";
import { useToast } from "../../hooks/use-toast";
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import AntiCaptureGuard from '@/components/security/anti-capture-guard';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { getPublicUsernameFromPathname } from '@/utils/public-admin-scope';
import { resolveAdminUidByUsername } from '@/utils/admin-lookup-client';
import { isSuperAdminUsername } from '@/lib/superadmin-config';

// Interfaces
interface UploadedPhoto {
    id: string;
    title: string;
    imageUrl: string;
}

// Componentes de estado reutilizáveis
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
        <Camera className="h-12 w-12" />
        <p className="mt-4 text-lg font-semibold text-center">{message}</p>
    </div>
);

// Componente para fotos enviadas
const UploadedPhotoCard = ({ photo }: { photo: UploadedPhoto }) => {
    const [imageError, setImageError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [retryUnoptimized, setRetryUnoptimized] = useState(false);

    const handleImageError = () => {
        if (!retryUnoptimized) {
            // Se falhar otimizado, tenta carregar diretamente (unoptimized)
            setRetryUnoptimized(true);
        } else {
            // Se falhar também unoptimized, mostra erro
            setImageError(true);
        }
    };

    const handleImageLoad = () => {
        setImageLoaded(true);
    };

    return (
        <>
            <div className="group relative w-full overflow-hidden rounded-lg border border-primary/20 hover:border-primary hover:shadow-neon-red-light transition-all">
                <div className="relative w-full bg-black">
                    {photo.imageUrl && !imageError ? (
                        <>
                            {/* Imagem principal */}
                            <Image
                                src={photo.imageUrl}
                                alt={photo.title}
                                width={1200}
                                height={800}
                                className="w-full h-auto object-contain transition-transform duration-300 group-hover:scale-105"
                                onError={handleImageError}
                                onLoad={handleImageLoad}
                                unoptimized={retryUnoptimized}
                            />

                            {/* Overlay quando imagem não carregou ainda */}
                            {!imageLoaded && !imageError && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                    <div className="text-white text-center">
                                        <Camera className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        // Fallback quando imagem falha
                        <div className="relative w-full h-full bg-gray-900 flex flex-col items-center justify-center text-white">
                            <div className="text-center">
                                <Camera className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                                <p className="text-sm">Erro ao carregar imagem</p>
                            </div>
                        </div>
                    )}

                    {/* Info da foto */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="text-white">
                            <p className="text-sm font-medium">{photo.title}</p>
                        </div>
                    </div>

                    {/* Botão de fullscreen */}
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => setIsFullscreen(true)}
                            className="bg-black/70 hover:bg-black/90 text-white p-2 rounded-full transition-colors"
                            title="Visualizar em tela cheia"
                        >
                            <Maximize2 className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal de fullscreen */}
            <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
                <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 flex flex-col">
                    <DialogHeader className="p-4 pb-2 flex-shrink-0">
                        <DialogTitle>
                            {photo.title}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 p-4 pt-0 min-h-0">
                        {photo.imageUrl && (
                            <div className="w-full h-full flex items-center justify-center">
                                <Image
                                    src={photo.imageUrl}
                                    alt={photo.title}
                                    width={1200}
                                    height={1200}
                                    className="max-w-full max-h-full object-contain rounded-lg"
                                    priority
                                    unoptimized={retryUnoptimized}
                                    onError={() => setRetryUnoptimized(true)}
                                />
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

// Componente para a aba de Uploads
const UploadsFeed = () => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPhotos = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const photosCollection = collection(db, "photos");

                // Determinar adminUid com base no username da URL
                let adminUidFilter: string | null = null;
                if (typeof window !== 'undefined') {
                    const username = getPublicUsernameFromPathname(window.location.pathname);
                    if (username && !isSuperAdminUsername(username)) {
                        adminUidFilter = await resolveAdminUidByUsername(username);
                        // Se username não resolvido, não mostrar dados globais
                        if (!adminUidFilter) {
                            setPhotos([]);
                            setIsLoading(false);
                            return;
                        }
                    }
                }

                const q = adminUidFilter
                    ? query(photosCollection, where('adminUid', '==', adminUidFilter), orderBy("createdAt", "desc"))
                    : query(photosCollection, orderBy("createdAt", "desc"));
                const querySnapshot = await getDocs(q);
                const photosList = querySnapshot.docs.map(doc => {
                    const data = doc.data() as Record<string, any>;
                    return {
                        id: doc.id,
                        title: data.title || data.name || 'Foto enviada',
                        imageUrl: data.photoUrl || data.url || data.imageUrl || '',
                        ...data
                    } as UploadedPhoto;
                });
                setPhotos(photosList);
            } catch (e: any) {
                setError("Não foi possível carregar as fotos do servidor.");
                toast({
                    variant: "destructive",
                    title: "Erro ao Carregar Fotos",
                    description: "Houve um problema ao buscar as fotos enviadas.",
                });
            } finally {
                setIsLoading(false);
            }
        };
        fetchPhotos();
    }, [toast]);

    if (isLoading) return <FeedLoading message="Carregando fotos enviadas..." />;
    if (error) return <FeedError message={error} />;
    if (photos.length === 0) return <FeedEmpty message="Nenhuma foto foi enviada ainda." />;

    return (
        <div className="flex flex-col gap-4">
            {photos.map(photo => (
                <UploadedPhotoCard key={photo.id} photo={photo} />
            ))}
        </div>
    );
};

export default function PhotosPage() {
    return (
        <main className="flex flex-1 w-full flex-col items-center p-4 bg-background">
            <AntiCaptureGuard scope="exclusive" />
            <Card className="w-full max-w-6xl animate-in fade-in-0 zoom-in-95 duration-500 shadow-neon-red-strong border-primary/50 bg-card/90 backdrop-blur-xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl text-white text-shadow-neon-red-light flex items-center justify-center gap-3">
                        <Camera /> Galeria de Fotos
                    </CardTitle>
                    <CardDescription className="text-lg text-muted-foreground">
                        Fotos enviadas por upload.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <UploadsFeed />
                </CardContent>
            </Card>
        </main>
    );
}

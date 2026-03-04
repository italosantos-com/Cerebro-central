"use client";

import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, ImageIcon } from 'lucide-react';
import { useAdminGallery } from '@/hooks/use-admin-gallery';

const GallerySection = () => {
    const { galleryPhotos, galleryNames, loading: galleryLoading, error: galleryError, refreshSettings } = useAdminGallery();

    // Criar galerias usando as fotos e nomes do painel admin, filtrando apenas as que têm fotos configuradas
    const galleries = galleryNames
        .map((galleryName, i) => {
            // Pegar a foto correspondente do admin
            const adminPhoto = galleryPhotos[i];
            const photoUrl = adminPhoto?.url;

            // Só incluir se a foto existe e não é placeholder
            if (!photoUrl || photoUrl === 'https://placehold.co/400x600.png') {
                return null;
            }

            return {
                id: i,
                word: galleryName, // Usar o nome personalizado da galeria
                photos: [{
                    src: photoUrl,
                    hint: i % 2 === 0 ? "fashion editorial" : "urban model",
                    id: 0
                }]
            };
        })
        .filter((gallery): gallery is NonNullable<typeof gallery> => gallery !== null); // Remove nulls e type assertion

    return (
        <>
            <div className="h-0.5 w-full my-4 md:my-6 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
            <div className="py-6 md:py-10 space-y-6 md:space-y-10">
                {galleryLoading ? (
                    // Estado de loading das galerias
                    <div className="flex flex-col items-center justify-center py-12 md:py-20">
                        <Loader2 className="h-8 w-8 md:h-10 md:w-10 animate-spin text-primary mb-4" />
                        <p className="text-muted-foreground text-base md:text-lg">Carregando galerias...</p>
                    </div>
                ) : galleryError ? (
                    // Estado de erro das galerias
                    <div className="flex flex-col items-center justify-center py-12 md:py-20">
                        <AlertCircle className="h-8 w-8 md:h-10 md:w-10 text-destructive mb-4" />
                        <p className="text-destructive mb-4 text-base md:text-lg">Erro ao carregar galerias</p>
                        <Button
                            variant="outline"
                            onClick={refreshSettings}
                            className="border-primary/50 hover:bg-primary hover:text-primary-foreground"
                        >
                            Tentar Novamente
                        </Button>
                    </div>
                ) : galleries.length === 0 ? (
                    // Estado quando não há fotos configuradas
                    <div className="flex flex-col items-center justify-center py-12 md:py-20">
                        <ImageIcon className="h-8 w-8 md:h-10 md:w-10 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground text-center text-base md:text-lg">
                            Galeria em breve...
                        </p>
                    </div>
                ) : (
                    // Galerias com fotos configuradas
                    galleries.map((gallery) => (
                        <div key={gallery.id}>
                            <div className="w-full px-2 md:px-4 lg:px-8">
                                <Carousel className="w-full" opts={{ loop: true }}>
                                    <CarouselContent>
                                        {gallery.photos.map((photo) => (
                                            <CarouselItem key={photo.id} className="basis-full">
                                                <div className="p-0.5 md:p-1 space-y-2 md:space-y-3">
                                                    <Card className="overflow-hidden border-primary/30 hover:border-primary/60 hover:shadow-lg transition-all duration-300 bg-card/50 backdrop-blur-sm">
                                                        <CardContent className="flex aspect-[9/16] md:aspect-[3/4] lg:aspect-[9/16] items-center justify-center p-0">
                                                            <Image
                                                                src={photo.src}
                                                                alt={`Foto da galeria ${gallery.word}`}
                                                                width={400}
                                                                height={800}
                                                                className="w-full h-full object-contain bg-black/10"
                                                                data-ai-hint={photo.hint}
                                                            />
                                                        </CardContent>
                                                    </Card>
                                                </div>
                                            </CarouselItem>
                                        ))}
                                    </CarouselContent>
                                    <CarouselPrevious className="ml-8 md:ml-14 bg-background/60 border-primary/40 text-primary-foreground hover:bg-primary hover:border-primary" />
                                    <CarouselNext className="mr-8 md:mr-14 bg-background/60 border-primary/40 text-primary-foreground hover:bg-primary hover:border-primary" />
                                </Carousel>
                                <p className="text-center text-primary text-2xl md:text-4xl lg:text-5xl tracking-wider uppercase mt-2 md:mt-3 font-semibold">
                                    {gallery.word}
                                </p>
                            </div>
                            <div className="h-0.5 max-w-xl mx-auto my-6 md:my-10 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
                        </div>
                    ))
                )}
            </div>
        </>
    );
};

export default GallerySection;

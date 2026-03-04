import { Card, CardContent } from "@/components/ui/card";
import { Instagram, Upload } from "lucide-react";
import { fetchInstagramProfileFeed, InstagramMedia } from "@/ai/flows/instagram-feed-flow";
import Image from "next/image";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import { listMedia } from "@/services/storage-service"; // Importar a nova função
import AntiCaptureGuard from "@/components/security/anti-capture-guard";

interface MediaItem {
  id: string;
  text?: string | null;
  imageUrl: string;
  postUrl: string;
  source: 'Instagram' | 'Storage';
}

export default async function Page() {
  let allPhotos: MediaItem[] = [];
  const errors: string[] = [];

  // Fetch from Instagram (@severepics)
  try {
    const instagramFeed = await fetchInstagramProfileFeed();
    if (instagramFeed.error) {
        errors.push(instagramFeed.error);
    } else {
        const instagramPhotos = instagramFeed.media
            .filter((item: InstagramMedia) => item.media_type === 'IMAGE' || item.media_type === 'CAROUSEL_ALBUM')
            .map((item: InstagramMedia) => ({
                id: item.id,
                text: item.caption,
                imageUrl: item.media_url!,
                postUrl: item.permalink,
                source: 'Instagram' as const,
            }));
        allPhotos.push(...instagramPhotos);
    }
  } catch(e: any) {
      errors.push(e.message || "An unexpected error occurred while fetching from Instagram.");
  }
  
  // Fetch from Firebase Storage
  try {
    const storagePhotosUrls = await listMedia('uploads/images/'); // Chamar a nova função
    const storagePhotos = storagePhotosUrls.map(url => ({
        id: url, // Usar a URL como ID (pode ser ajustado se necessário)
        text: null, // Sem texto associado a partir do Storage
        imageUrl: url,
        postUrl: url, // Usar a URL como postUrl (pode ser ajustado se necessário)
        source: 'Storage' as const,
    }));
    allPhotos.push(...storagePhotos);
  } catch (e: any) {
      errors.push(e.message || "An unexpected error occurred while fetching from Storage.");
  }

  // Embaralhar as fotos para misturar as fontes
  allPhotos = allPhotos.sort(() => 0.5 - Math.random());

  return (
    <div className="container py-16 md:py-24">
      <AntiCaptureGuard scope="exclusive" />
      <div className="text-center mb-12">
        <h1 className="font-headline text-4xl md:text-5xl text-primary">
          Galeria de Fotos
        </h1>
        <p className="mx-auto max-w-2xl mt-4 text-lg text-muted-foreground">
          Um banquete para os olhos. Veja nossas fotos mais recentes, direto das nossas redes sociais e de uploads exclusivos.
        </p>
        <div className="flex justify-center gap-4 mt-4">
            <Link href="https://instagram.com/severepics" target="_blank" aria-label="Instagram">
                <Instagram className="h-6 w-6 text-muted-foreground hover:text-primary" />
            </Link>
            <Link href="/admin/upload" aria-label="Upload">
                <Upload className="h-6 w-6 text-muted-foreground hover:text-primary" />
            </Link>
        </div>
      </div>

      {errors.length > 0 && (
        <Alert variant="destructive" className="mb-8">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Erro ao Carregar Mídias</AlertTitle>
          <AlertDescription>
            <ul>
              {errors.map((error, index) => <li key={index}>- {error}</li>)}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {allPhotos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {allPhotos.map((photo) => (
            <Card key={`${photo.source}-${photo.id}`} className="overflow-hidden group cursor-pointer">
              {/* Se for do Storage, não tem link para post externo, apenas exibe a imagem */}
              {photo.source === 'Storage' ? (
                 <CardContent className="p-0">
                  <div className="relative aspect-square">
                      {photo.imageUrl && (
                        <Image 
                            src={photo.imageUrl} 
                            alt={photo.text || 'Imagem da galeria'} 
                            className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                            fill 
                            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            priority={false}
                        />
                      )}
                      {/* Opcional: adicionar um indicador de que a imagem é do Storage */}
                       <div className="absolute bottom-1 right-1">
                           <Upload className="h-5 w-5 text-white/80 bg-black/50 rounded-full p-1"/>
                       </div>
                  </div>
                  </CardContent>
              ) : (
                <Link href={photo.postUrl} target="_blank" rel="noopener noreferrer">
                  <CardContent className="p-0">
                  <div className="relative aspect-square">
                      {photo.imageUrl && (
                        <Image 
                            src={photo.imageUrl} 
                            alt={photo.text || 'Imagem da galeria'} 
                            className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                            fill 
                            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            priority={false}
                        />
                      )}
                      <div className="absolute bottom-1 right-1">
                          {photo.source === 'Instagram' && <Instagram className="h-5 w-5 text-white/80 bg-black/50 rounded-full p-1"/>}
                      </div>
                  </div>
                  </CardContent>
              </Link>
              )}
            </Card>
          ))}
        </div>
      ) : errors.length === 0 && (
         <div className="text-center py-8 text-muted-foreground">
            <p>Nenhuma foto encontrada nos feeds.</p>
         </div>
      )}
    </div>
  );
}
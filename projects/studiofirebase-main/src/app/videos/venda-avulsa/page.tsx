
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlayCircle, Video, Loader2, AlertCircle, Twitter } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { getTwitterMedia } from '@/app/actions/twitter';
import type { TwitterMediaInput, TwitterMediaOutput } from '@/ai/flows/twitter-flow';

// Tipo para compatibilidade
type TweetWithMedia = {
  id: string;
  text: string;
  media: {
    media_key: string;
    type: string;
    url?: string;
    preview_image_url?: string;
  }[];
  created_at?: string;
  username: string;
  profile_image_url?: string;
  isRetweet?: boolean;
};

interface Media {
  url?: string;
  preview_image_url?: string;
  type: string;
  media_key: string;
  variants?: { bit_rate?: number, content_type: string, url: string }[];
}

const VideoCard = ({ video, text }: { video: Media; text: string }) => {
    // Encontra a melhor variante de vídeo (maior bitrate)
    const videoVariant = video.variants
        ?.filter(v => v.content_type === 'video/mp4')
        .sort((a, b) => (b.bit_rate || 0) - (a.bit_rate || 0))[0];

    const videoUrl = videoVariant?.url;

    return (
        <Card className="w-full animate-in fade-in-0 zoom-in-95 duration-500 border border-gray-700 bg-black/90 backdrop-blur-xl group">
            <CardHeader className="p-0">
                <div className="block relative aspect-video overflow-hidden rounded-t-lg bg-muted">
                    {videoUrl ? (
                         <video 
                            src={videoUrl} 
                            poster={video.preview_image_url} 
                            controls 
                            className="w-full h-full object-cover"
                         />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-center p-4">
                             <div className='flex flex-col items-center gap-2'>
                                <AlertCircle className="h-8 w-8 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">Vídeo não disponível para visualização direta.</p>
                             </div>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <CardDescription className="mt-2 text-muted-foreground line-clamp-3">{text}</CardDescription>
            </CardContent>
        </Card>
    );
};

export default function VendaAvulsaPage() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [videos, setVideos] = useState<TweetWithMedia[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [currentUsername, setCurrentUsername] = useState('Severepics');

    // Carregar username das configurações
    useEffect(() => {
        const savedUsername = localStorage.getItem('twitter_username') || sessionStorage.getItem('twitter_username');
        if (savedUsername) {
            setCurrentUsername(savedUsername);
        }
    }, []);

    const fetchFeed = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Usa o username configurado ou o padrão
            const username = localStorage.getItem('twitter_username') || sessionStorage.getItem('twitter_username') || 'Severepics';
            const result: any = await getTwitterMedia({ 
                username, 
                maxResults: 100, 
                mediaType: 'videos' 
            });
            const response: TwitterMediaOutput = result;
            
            // A nova função já filtra por vídeos, não precisa filtrar novamente
            setVideos(response.tweets);
        } catch (e: any) {
            const errorMessage = e.message || "Ocorreu um erro desconhecido.";
            let displayMessage = errorMessage;
            
            // Mensagem mais amigável para rate limiting
            if (errorMessage.includes('Rate limit') || errorMessage.includes('Too Many Requests')) {
                displayMessage = "🚫 Limite de requisições da API do X atingido.\n\n⏱️ Tente novamente em 15-30 minutos.\n\n💡 Os dados ficam em cache por 1 hora para evitar esse problema.";
            }
            
            setError(`Erro ao carregar: ${displayMessage}`);
            toast({
                variant: 'destructive',
                title: 'Erro ao Carregar Vídeos',
                description: displayMessage,
                duration: 8000, // Mais tempo para ler a mensagem
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchFeed();
     
    }, [toast, currentUsername]); // Recarrega quando o username muda, fetchFeed é estável

    // Listener para mudanças no localStorage e sessionStorage
    useEffect(() => {
        const handleStorageChange = () => {
            const newUsername = localStorage.getItem('twitter_username') || sessionStorage.getItem('twitter_username') || 'Severepics';
            if (newUsername !== currentUsername) {
                setCurrentUsername(newUsername);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        
        // Também escuta mudanças internas (quando muda na mesma aba)
        const checkUsername = () => {
            const newUsername = localStorage.getItem('twitter_username') || sessionStorage.getItem('twitter_username') || 'Severepics';
            if (newUsername !== currentUsername) {
                setCurrentUsername(newUsername);
            }
        };
        
        const interval = setInterval(checkUsername, 1000);
        
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(interval);
        };
    }, [currentUsername]);

  return (
    <main className="flex flex-1 w-full flex-col items-center p-4 bg-background">
        <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white flex items-center justify-center gap-3">
              <Twitter /> Vídeos do X
            </h1>
            <p className="text-lg text-gray-400 mt-2">
                Feed de vídeos de <span className="font-medium text-white">@{currentUsername}</span>
            </p>
        </div>
        <div className="w-full max-w-4xl space-y-12">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                    <Loader2 className="h-12 w-12 animate-spin text-gray-200" />
                    <p className="mt-4 text-gray-400">Carregando vídeos...</p>
                </div>
            ) : error ? (
                 <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-400 bg-gray-900 rounded-lg p-8">
                    <AlertCircle className="h-12 w-12 mb-4" />
                    <p className="text-lg font-semibold mb-2">Erro ao carregar vídeos</p>
                    <p className="text-sm text-center mb-6 whitespace-pre-line max-w-md">{error}</p>
                    <Button 
                        onClick={fetchFeed} 
                        disabled={isLoading}
                        variant="outline"
                        className="flex items-center gap-2"
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Twitter className="h-4 w-4" />
                        )}
                        Tentar Novamente
                    </Button>
                </div>
            ) : videos.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-400">
                    <Video className="h-12 w-12" />
                    <p className="mt-4 text-lg font-semibold">Nenhum vídeo encontrado.</p>
                    <p className="text-sm">Parece que não há tweets com vídeos recentes.</p>
                </div>
            ) : (
                videos.flatMap(tweet => 
                    tweet.media.map(media => (
                        <VideoCard key={media.media_key} video={media} text={tweet.text} />
                    ))
                )
            )}
      </div>
    </main>
  );
}

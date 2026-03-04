'use client';

import { useState, useEffect } from 'react';
import { FirebaseFile, fetchFirebaseFiles, isImageFile, isVideoFile } from '@/lib/firebase-storage';
import { ProtectedMedia } from './protected-media';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Loader2, AlertCircle, FileImage } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from './ui/dialog';
import { VisuallyHidden } from '@/components/ui/visually-hidden';

interface ProtectedGalleryProps {
  folderPath?: string;
  mediaType?: 'all' | 'images' | 'videos';
  className?: string;
  showMetadata?: boolean;
}

export function ProtectedGallery({
  folderPath = 'general-uploads',
  mediaType = 'all',
  className = '',
  showMetadata = false
}: ProtectedGalleryProps) {
  const [files, setFiles] = useState<FirebaseFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFiles = async () => {
      setLoading(true);
      setError(null);

      try {
        const allFiles = await fetchFirebaseFiles(folderPath);

        // Filtrar por tipo de mídia
        let filteredFiles = allFiles;
        if (mediaType === 'images') {
          filteredFiles = allFiles.filter(file => isImageFile(file.type));
        } else if (mediaType === 'videos') {
          filteredFiles = allFiles.filter(file => isVideoFile(file.type));
        } else if (mediaType === 'all') {
          filteredFiles = allFiles.filter(file => isImageFile(file.type) || isVideoFile(file.type));
        }

        setFiles(filteredFiles);
      } catch (err: unknown) {
        console.error('Erro ao carregar arquivos:', err);
        setError('Não foi possível carregar os arquivos. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    loadFiles();
  }, [folderPath, mediaType]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
        <p className="mt-4 text-muted-foreground">Carregando galeria...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-400 bg-gray-900/10 rounded-lg p-4">
        <AlertCircle className="h-12 w-12" />
        <p className="mt-4 font-semibold">Erro ao carregar galeria</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
        <FileImage className="h-12 w-12" />
        <p className="mt-4">Nenhum arquivo encontrado</p>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {files.map((file) => (
        <Card key={file.fullPath} className="group overflow-hidden border border-gray-700 hover:border-gray-400 hover:shadow-lg transition-all">
          <CardContent className="p-0">
            {isImageFile(file.type) ? (
              <Dialog>
                <DialogTrigger asChild>
                  <div className="cursor-pointer aspect-square overflow-hidden">
                    <ProtectedMedia
                      file={file}
                      width={400}
                      height={400}
                      className="h-full w-full object-contain bg-black/10 transition-transform duration-300 group-hover:scale-110"
                      alt={file.name}
                    />
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <VisuallyHidden>
                    <DialogTitle>{file.name}</DialogTitle>
                  </VisuallyHidden>
                  <ProtectedMedia
                    file={file}
                    width={800}
                    height={600}
                    className="w-full h-auto object-contain"
                    alt={file.name}
                    showPreview={false}
                  />
                </DialogContent>
              </Dialog>
            ) : (
              <div className="aspect-video overflow-hidden">
                <ProtectedMedia
                  file={file}
                  width={400}
                  height={225}
                  className="h-full w-full"
                  alt={file.name}
                />
              </div>
            )}

            {showMetadata && (
              <div className="p-3 bg-card/50 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate flex-1 mr-2" title={file.name}>
                    {file.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant={file.metadata?.visibility === 'subscribers' ? 'secondary' : 'default'} className="text-xs">
                      {file.metadata?.visibility === 'subscribers' ? 'Assinantes' : 'Público'}
                    </Badge>
                    <div className={`w-2 h-2 rounded-full ${file.metadata?.visibility === 'subscribers' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}></div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(file.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default ProtectedGallery;

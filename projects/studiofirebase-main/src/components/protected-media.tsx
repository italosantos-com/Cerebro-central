'use client';

import { ReactNode } from 'react';
import Image from 'next/image';
import { ContentProtector } from './content-protector';
import { useContentAccess } from '@/hooks/use-content-access';
import { PlayCircle, Image as ImageIcon } from 'lucide-react';

interface MediaFile {
  url: string;
  name: string;
  type: string;
  visibility?: 'public' | 'subscribers';
  metadata?: {
    visibility?: 'public' | 'subscribers';
  };
}

interface ProtectedMediaProps {
  file: MediaFile;
  className?: string;
  width?: number;
  height?: number;
  showPreview?: boolean;
  alt?: string;
}

export function ProtectedMedia({ 
  file, 
  className = '', 
  width = 400, 
  height = 300, 
  showPreview = true,
  alt 
}: ProtectedMediaProps) {
  const { canAccessSubscriberContent } = useContentAccess();
  
  // Determinar visibilidade (priorizar metadata)
  const visibility = file.metadata?.visibility || file.visibility || 'public';
  
  // Se for público ou usuário tem acesso, mostrar normalmente
  if (visibility === 'public' || (visibility === 'subscribers' && canAccessSubscriberContent)) {
    if (file.type.startsWith('image/')) {
      return (
        <Image
          src={file.url}
          alt={alt || file.name}
          width={width}
          height={height}
          className={`rounded-lg object-cover ${className}`}
        />
      );
    }
    
    if (file.type.startsWith('video/')) {
      return (
        <video
          src={file.url}
          controls
          className={`rounded-lg ${className}`}
          width={width}
          height={height}
        >
          Seu navegador não suporta o elemento de vídeo.
        </video>
      );
    }
    
    // Para outros tipos de arquivo
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg ${className}`} 
           style={{ width, height }}>
        <div className="text-center">
          <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{file.name}</p>
        </div>
      </div>
    );
  }

  // Conteúdo protegido - usar ContentProtector
  const mediaPreview = file.type.startsWith('image/') ? (
    <Image
      src={file.url}
      alt={alt || file.name}
      width={width}
      height={height}
      className={`rounded-lg object-cover ${className}`}
    />
  ) : file.type.startsWith('video/') ? (
    <div className={`relative bg-black rounded-lg flex items-center justify-center ${className}`}
         style={{ width, height }}>
      <PlayCircle className="h-16 w-16 text-white/80" />
      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
        {file.name}
      </div>
    </div>
  ) : (
    <div className={`flex items-center justify-center bg-muted rounded-lg ${className}`} 
         style={{ width, height }}>
      <div className="text-center">
        <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{file.name}</p>
      </div>
    </div>
  );

  return (
    <ContentProtector 
      visibility={visibility} 
      showPreview={showPreview}
      className={className}
    >
      {mediaPreview}
    </ContentProtector>
  );
}

export default ProtectedMedia;

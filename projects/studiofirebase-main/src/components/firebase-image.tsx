"use client";

import Image, { ImageProps } from 'next/image';
import { useState } from 'react';
import { normalizeFirebaseStorageUrl } from '@/lib/firebase-storage-url';

/**
 * Componente de imagem otimizado para URLs do Firebase Storage
 * Detecta automaticamente URLs do Firebase e usa proxy ou desabilita otimização quando necessário
 */
export function FirebaseImage(props: ImageProps) {
  const { src, alt, ...rest } = props;
  const [imageError, setImageError] = useState(false);

  const normalizedSrc = typeof src === 'string' ? normalizeFirebaseStorageUrl(src) : src;
  
  // Verificar se é uma URL do Firebase Storage
  const isFirebaseStorage = typeof normalizedSrc === 'string' && (
    normalizedSrc.includes('storage.googleapis.com') ||
    normalizedSrc.includes('firebasestorage.googleapis.com') ||
    normalizedSrc.includes('firebasestorage.app')
  );

  // Verificar se tem parâmetros de assinatura (Signed URLs)
  const hasSignatureParams = typeof normalizedSrc === 'string' && (
    normalizedSrc.includes('GoogleAccessId=') ||
    normalizedSrc.includes('Signature=') ||
    normalizedSrc.includes('Expires=')
  );

  // Para URLs assinadas do Firebase, usar proxy ou desabilitar otimização
  const looksLikeBadBucket = typeof normalizedSrc === 'string' && normalizedSrc.includes('.firebasestorage.app');
  const shouldUseProxy = isFirebaseStorage && (hasSignatureParams || looksLikeBadBucket) && !imageError;
  const proxySrc = shouldUseProxy && typeof normalizedSrc === 'string'
    ? `/api/image-proxy?url=${encodeURIComponent(normalizedSrc)}`
    : normalizedSrc;

  // Se o proxy falhar, desabilitar otimização e usar URL original
  const finalSrc = imageError ? normalizedSrc : proxySrc;
  const isSvgSrc = typeof finalSrc === 'string' && /\.svg(\?|#|$)/i.test(finalSrc);
  const shouldUnoptimize = imageError || (isFirebaseStorage && hasSignatureParams) || isSvgSrc;

  return (
    <Image
      src={finalSrc}
      alt={alt || ''}
      {...rest}
      unoptimized={shouldUnoptimize || rest.unoptimized}
      onError={(e) => {
        // Se houver erro, tentar sem proxy
        if (!imageError) {
          setImageError(true);
        }
        // Chamar onError original se existir
        if (rest.onError) {
          rest.onError(e);
        }
      }}
    />
  );
}

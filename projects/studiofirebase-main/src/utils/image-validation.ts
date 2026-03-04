/**
 * Utilitário para validar URLs de imagem para compatibilidade com Next.js Image component
 */

/**
 * Valida se um src é válido para o componente Image do Next.js
 * @param src - URL da imagem
 * @param fallback - URL de fallback (padrão: '/placeholder-photo.svg')
 * @returns URL válida para Next.js Image
 */
export function getValidImageSrc(src: string | null | undefined, fallback: string = '/placeholder-photo.svg'): string {
  // Se não há src, retorna fallback
  if (!src || typeof src !== 'string' || src.trim().length === 0) {
    return fallback;
  }

  // Se começa com /, http:// ou https://, é válido
  if (src.startsWith('/') || src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }

  // Se não for válido, log warning e retorna fallback
  console.warn('[Image Validation] URL inválida para next/image:', src);
  return fallback;
}

/**
 * Versões especializadas para diferentes tipos de conteúdo
 */
export const getValidVideoThumbnailSrc = (src: string | null | undefined) => 
  getValidImageSrc(src, '/placeholder-video.svg');

export const getValidProfileImageSrc = (src: string | null | undefined) => 
  getValidImageSrc(src, '/placeholder-profile.svg');

export const getValidPhotoSrc = (src: string | null | undefined) => 
  getValidImageSrc(src, '/placeholder-photo.svg');
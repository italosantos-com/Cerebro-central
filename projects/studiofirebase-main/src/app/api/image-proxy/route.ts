import { NextRequest, NextResponse } from 'next/server';
import { normalizeFirebaseStorageUrl } from '@/lib/firebase-storage-url';
import { getAdminBucket } from '@/lib/firebase-admin';

function parseFirebaseObjectFromUrl(url: string): { bucket: string; objectPath: string } | null {
  try {
    const parsed = new URL(url);

    // https://storage.googleapis.com/<bucket>/<object>
    if (parsed.hostname === 'storage.googleapis.com') {
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts.length < 2) return null;
      const bucket = parts[0];
      const objectPath = decodeURIComponent(parts.slice(1).join('/'));
      return { bucket, objectPath };
    }

    // https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<object>
    if (parsed.hostname === 'firebasestorage.googleapis.com') {
      const match = parsed.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
      if (!match) return null;
      const [, bucket, objectPath] = match;
      return { bucket, objectPath: decodeURIComponent(objectPath) };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * API Route para proxy de imagens do Firebase Storage
 * Resolve problemas com URLs assinadas que causam erro 400 no otimizador de imagens do Next.js
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'URL da imagem não fornecida' },
        { status: 400 }
      );
    }

    const normalizedUrl = normalizeFirebaseStorageUrl(imageUrl);

    // Verificar se é uma URL do Firebase Storage
    const isFirebaseStorage = 
      normalizedUrl.includes('storage.googleapis.com') ||
      normalizedUrl.includes('firebasestorage.googleapis.com') ||
      normalizedUrl.includes('firebasestorage.app');

    if (!isFirebaseStorage) {
      return NextResponse.json(
        { error: 'URL deve ser do Firebase Storage' },
        { status: 400 }
      );
    }

    // Preferir ler via Admin SDK (evita 403 de URLs assinadas antigas/bucket incorreto)
    const parsedObject = parseFirebaseObjectFromUrl(normalizedUrl);
    const adminBucket = getAdminBucket();

    if (parsedObject && adminBucket) {
      const normalizedBucket = parsedObject.bucket.replace(/\.firebasestorage\.app$/i, '.appspot.com');
      if (normalizedBucket !== adminBucket.name) {
        return NextResponse.json(
          { error: 'Bucket não permitido' },
          { status: 403 }
        );
      }

      const file = adminBucket.file(parsedObject.objectPath);
      const [exists] = await file.exists();
      if (!exists) {
        return NextResponse.json(
          { error: 'Arquivo não encontrado' },
          { status: 404 }
        );
      }

      const [metadata] = await file.getMetadata();
      const contentType = metadata?.contentType || 'image/jpeg';
      const [buffer] = await file.download();
      const body = new Blob([Uint8Array.from(buffer)], { type: contentType });

      return new NextResponse(body, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Fallback: fetch direto (mantém compatibilidade se Admin não estiver disponível)
    const imageResponse = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Next.js Image Proxy)',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!imageResponse.ok) {
      console.error(`Erro ao buscar imagem: ${imageResponse.status} ${imageResponse.statusText}`);
      return NextResponse.json(
        { error: `Erro ao buscar imagem: ${imageResponse.status}` },
        { status: imageResponse.status }
      );
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

    // Retornar a imagem com headers apropriados
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Erro no proxy de imagem:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * YouTube Storage API
 * Upload de vídeos para YouTube
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';
import { isSuperAdminUsername } from '@/lib/superadmin-config';

export const runtime = 'nodejs';

// YouTube Data API v3
const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_UPLOAD_API = 'https://www.googleapis.com/upload/youtube/v3';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('[YouTube] Iniciando upload de vídeo...');

    // Verificar autenticação admin
    const authResult = await requireAdminApiAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    // SuperAdmin não pode usar este endpoint
    if (isSuperAdminUsername(authResult.adminDoc?.username)) {
      return NextResponse.json({
        success: false,
        error: 'SuperAdmin usa Firebase Storage. Este endpoint é apenas para admins regulares.'
      }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string || 'Vídeo sem título';
    const description = formData.get('description') as string || '';
    const privacy = formData.get('privacy') as string || 'unlisted'; // public, unlisted, private

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'Nenhum arquivo fornecido'
      }, { status: 400 });
    }

    // Validar que é um vídeo
    if (!file.type.startsWith('video/')) {
      return NextResponse.json({
        success: false,
        error: 'Apenas arquivos de vídeo são aceitos para upload no YouTube'
      }, { status: 400 });
    }

    // Obter access token do YouTube/Google
    const youtubeAccessToken = authResult.adminDoc?.youtube?.accessToken;
    
    if (!youtubeAccessToken) {
      return NextResponse.json({
        success: false,
        error: 'Autenticação com YouTube não configurada. Configure em Configurações > Integrações.'
      }, { status: 401 });
    }

    // Converter arquivo para buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Metadados do vídeo
    const videoMetadata = {
      snippet: {
        title,
        description,
        categoryId: '22' // 22 = People & Blogs
      },
      status: {
        privacyStatus: privacy,
        selfDeclaredMadeForKids: false
      }
    };

    // Upload multipart para YouTube
    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const closeDelimiter = "\r\n--" + boundary + "--";

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(videoMetadata) +
      delimiter +
      'Content-Type: ' + file.type + '\r\n' +
      'Content-Transfer-Encoding: base64\r\n' +
      '\r\n' +
      buffer.toString('base64') +
      closeDelimiter;

    console.log('[YouTube] Enviando vídeo...');

    const response = await fetch(
      `${YOUTUBE_UPLOAD_API}/videos?uploadType=multipart&part=snippet,status`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${youtubeAccessToken}`,
          'Content-Type': `multipart/related; boundary="${boundary}"`
        },
        body: multipartRequestBody
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[YouTube] Erro na resposta:', errorData);
      throw new Error(errorData.error?.message || 'Falha no upload para YouTube');
    }

    const data = await response.json();

    // URL do vídeo
    const videoUrl = `https://www.youtube.com/watch?v=${data.id}`;
    const embedUrl = `https://www.youtube.com/embed/${data.id}`;
    const thumbnailUrl = data.snippet?.thumbnails?.high?.url || data.snippet?.thumbnails?.default?.url;

    console.log('[YouTube] Upload bem-sucedido:', data.id);

    return NextResponse.json({
      success: true,
      provider: 'youtube',
      url: videoUrl,
      embedUrl,
      videoId: data.id,
      thumbnailUrl,
      title: data.snippet?.title,
      description: data.snippet?.description,
      privacyStatus: data.status?.privacyStatus
    });

  } catch (error) {
    console.error('[YouTube] Erro no upload:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao fazer upload para YouTube'
    }, { status: 500 });
  }
}

// Obter informações de um vídeo
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await requireAdminApiAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json({
        success: false,
        error: 'videoId é obrigatório'
      }, { status: 400 });
    }

    const youtubeAccessToken = authResult.adminDoc?.youtube?.accessToken;
    
    if (!youtubeAccessToken) {
      return NextResponse.json({
        success: false,
        error: 'Autenticação com YouTube não configurada'
      }, { status: 401 });
    }

    const response = await fetch(
      `${YOUTUBE_API}/videos?part=snippet,contentDetails,statistics,status&id=${videoId}`,
      {
        headers: {
          'Authorization': `Bearer ${youtubeAccessToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Falha ao obter informações do vídeo');
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Vídeo não encontrado'
      }, { status: 404 });
    }

    const video = data.items[0];

    return NextResponse.json({
      success: true,
      video: {
        id: video.id,
        title: video.snippet.title,
        description: video.snippet.description,
        thumbnailUrl: video.snippet.thumbnails.high.url,
        url: `https://www.youtube.com/watch?v=${video.id}`,
        embedUrl: `https://www.youtube.com/embed/${video.id}`,
        duration: video.contentDetails.duration,
        views: video.statistics.viewCount,
        likes: video.statistics.likeCount,
        privacyStatus: video.status.privacyStatus
      }
    });

  } catch (error) {
    console.error('[YouTube] Erro ao obter vídeo:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao obter informações do vídeo'
    }, { status: 500 });
  }
}

// Deletar vídeo
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await requireAdminApiAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json({
        success: false,
        error: 'videoId é obrigatório'
      }, { status: 400 });
    }

    const youtubeAccessToken = authResult.adminDoc?.youtube?.accessToken;
    
    if (!youtubeAccessToken) {
      return NextResponse.json({
        success: false,
        error: 'Autenticação com YouTube não configurada'
      }, { status: 401 });
    }

    const response = await fetch(
      `${YOUTUBE_API}/videos?id=${videoId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${youtubeAccessToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Falha ao deletar vídeo');
    }

    console.log('[YouTube] Vídeo deletado:', videoId);

    return NextResponse.json({
      success: true,
      message: 'Vídeo deletado com sucesso'
    });

  } catch (error) {
    console.error('[YouTube] Erro ao deletar vídeo:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao deletar vídeo'
    }, { status: 500 });
  }
}

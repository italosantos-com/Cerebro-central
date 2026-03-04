import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const { pathname, searchParams } = url;


  // Se estiver na action handler, segue normalmente
  if (pathname.startsWith('/auth/action')) {
    return NextResponse.next();
  }

  // Libera acesso ao painel admin sem exigir JWT
  if (/^\/admin(\/|$)/.test(pathname)) {
    return NextResponse.next();
  }

  const nestedProfileMatch = pathname.match(
    /^\/([^/]+)\/([^/]+)(?:\/(fotos|videos|loja|galeria-assinantes|ajuda))?\/?$/
  );
  if (nestedProfileMatch) {
    const [, currentUsername, targetUsername, section] = nestedProfileMatch;
    const isValidTargetUsername =
      currentUsername !== targetUsername &&
      ![
        'admin',
        'api',
        'auth',
        'assinante',
        'subscriber',
        'conversation',
        'conversations',
        'dashboard',
        'fotos',
        'videos',
        'loja',
        'galeria-assinantes',
        'ajuda',
        'login',
        'perfil',
        'settings',
        'photo',
        'stripe-connect',
        'superadmin',
      ].includes(targetUsername);

    if (isValidTargetUsername) {
      url.pathname = section ? `/${targetUsername}/${section}` : `/${targetUsername}`;
      return NextResponse.redirect(url);
    }
  }

  // Redireciona apenas UIDs e nomes de usuário, não páginas globais de fotos, vídeos, loja, conteúdo exclusivo, ajuda e suporte
  const matchPerfil = pathname.match(/^\/(bruno|severeoficial|severepics|[a-zA-Z0-9_-]{4,})$/);
  const paginasGlobais = [
     "fotos",
     "videos",
     "loja",
     "conteudo-exclusivo",
     "ajuda-e-suporte",
     "ajuda",
     "galeria-assinantes",
     "galeria-assinantes-simple",
     "conversation",
     "conversations",
     "subscriber",
     "assinante",
     "auth",
     "login",
     "dashboard",
     "perfil",
     "settings",
     "politica-de-privacidade",
     "termos-condicoes",
     "stripe-connect",
     "403",
     "photo",
     "admin",
     "api",
     "superadmin"
  ];
  if (matchPerfil && !paginasGlobais.includes(matchPerfil[1])) {
    // Mantém rota pública /:username sem redirecionar para /perfil
  }

  // Links de ação do Firebase
  if (searchParams.has('mode') && searchParams.has('oobCode')) {
    url.pathname = '/auth/action';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/:path*'],
};

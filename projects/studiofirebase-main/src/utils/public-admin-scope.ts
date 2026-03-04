const RESERVED_FIRST_SEGMENTS = new Set([
  'admin',
  'api',
  'auth',
  'assinante',
  'ajuda',
  'demo',
  'demos',
  'conversation',
  'conversations',
  'conteudo-exclusivo',
  'dashboard',
  'fotos',
  'galeria-assinantes',
  'galeria-assinantes-simple',
  'login',
  'loja',
  'photo',
  'perfil',
  'politica-de-privacidade',
  'settings',
  'stripe-connect',
  'subscriber',
  'termos-condicoes',
  'videos',
  'register',
  'signup',
  '_next',
  'public',
  'favicon.ico',
  '403',
]);

export function getPublicUsernameFromPathname(pathname: string | null | undefined): string | null {
  if (!pathname) return null;

  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return null;

  const segment = parts[0];
  if (!segment) return null;
  if (RESERVED_FIRST_SEGMENTS.has(segment)) return null;

  // Evita tratar rotas do admin por engano (ex: /admin-2)
  if (segment.startsWith('admin')) return null;

  return segment;
}

export function getContextualHomePath(pathname: string | null | undefined): string {
  const username = getPublicUsernameFromPathname(pathname);
  return username ? `/${username}` : '/';
}

export function getContextualPublicPath(pathname: string | null | undefined, targetPath: string): string {
  const normalizedTargetPath = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
  const username = getPublicUsernameFromPathname(pathname);

  if (!username) {
    return normalizedTargetPath;
  }

  return normalizedTargetPath === '/' ? `/${username}` : `/${username}${normalizedTargetPath}`;
}

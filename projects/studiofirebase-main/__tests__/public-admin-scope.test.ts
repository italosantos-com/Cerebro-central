import { getContextualHomePath, getContextualPublicPath, getPublicUsernameFromPathname } from '@/utils/public-admin-scope';

describe('getPublicUsernameFromPathname', () => {
  it('resolve o adminId em rotas aninhadas', () => {
    expect(getPublicUsernameFromPathname('/bruno')).toBe('bruno');
    expect(getPublicUsernameFromPathname('/bruno/perfil')).toBe('bruno');
    expect(getPublicUsernameFromPathname('/bruno/admin/settings')).toBe('bruno');
    expect(getPublicUsernameFromPathname('/bruno/subscriber/chat/abc123')).toBe('bruno');
    expect(getPublicUsernameFromPathname('/bruno/demo/apple-pay')).toBe('bruno');
    expect(getPublicUsernameFromPathname('/bruno/demos/paypal-italo')).toBe('bruno');
  });

  it('não trata rotas globais/reservadas como adminId', () => {
    expect(getPublicUsernameFromPathname('/')).toBeNull();
    expect(getPublicUsernameFromPathname('/perfil')).toBeNull();
    expect(getPublicUsernameFromPathname('/fotos')).toBeNull();
    expect(getPublicUsernameFromPathname('/ajuda')).toBeNull();
    expect(getPublicUsernameFromPathname('/demo/apple-pay')).toBeNull();
    expect(getPublicUsernameFromPathname('/demos/paypal-italo')).toBeNull();
    expect(getPublicUsernameFromPathname('/admin/settings')).toBeNull();
  });
});

describe('getContextualHomePath', () => {
  it('retorna home do perfil quando a rota contém username', () => {
    expect(getContextualHomePath('/bruno/fotos')).toBe('/bruno');
    expect(getContextualHomePath('/bruno/videos')).toBe('/bruno');
    expect(getContextualHomePath('/bruno/agenda')).toBe('/bruno');
    expect(getContextualHomePath('/bruno')).toBe('/bruno');
  });

  it('retorna home global quando a rota não contém username', () => {
    expect(getContextualHomePath('/')).toBe('/');
    expect(getContextualHomePath('/fotos')).toBe('/');
    expect(getContextualHomePath('/admin/settings')).toBe('/');
  });
});

describe('getContextualPublicPath', () => {
  it('preserva o escopo de username para links públicos', () => {
    expect(getContextualPublicPath('/bruno', '/fotos')).toBe('/bruno/fotos');
    expect(getContextualPublicPath('/bruno/videos', '/loja')).toBe('/bruno/loja');
    expect(getContextualPublicPath('/bruno/galeria-assinantes', '/ajuda')).toBe('/bruno/ajuda');
  });

  it('mantém links globais quando não há username no pathname', () => {
    expect(getContextualPublicPath('/', '/fotos')).toBe('/fotos');
    expect(getContextualPublicPath('/fotos', '/videos')).toBe('/videos');
    expect(getContextualPublicPath('/admin/settings', '/ajuda')).toBe('/ajuda');
  });
});

describe('isolamento de escopo ao trocar rota de perfil', () => {
  it('alterna corretamente entre perfil UID e global sem reutilizar username anterior', () => {
    expect(getPublicUsernameFromPathname('/bruno/admin/settings')).toBe('bruno');
    expect(getPublicUsernameFromPathname('/admin/settings')).toBeNull();
    expect(getPublicUsernameFromPathname('/carla/admin/settings')).toBe('carla');
  });
});

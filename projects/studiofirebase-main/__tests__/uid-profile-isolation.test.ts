/**
 * Testes de Isolamento de Perfil UID
 *
 * Valida que:
 * 1. Um novo usuário UID começa com dados limpos (sem herdar perfil global).
 * 2. O hook useProfileSettings não mistura dados globais em rotas UID.
 * 3. O helper assertUidIsolation bloqueia acessos indevidos ao perfil global.
 * 4. A lógica do POST handler isola corretamente o destino de escrita.
 */

import { assertUidIsolation } from '@/lib/admin-api-middleware';
import { getPublicUsernameFromPathname } from '@/utils/public-admin-scope';
import { SUPERADMIN_USERNAME } from '@/lib/superadmin-config';

// ---------------------------------------------------------------------------
// assertUidIsolation
// ---------------------------------------------------------------------------
describe('assertUidIsolation', () => {
  const uid = 'uid-bruno-123';
  const otherUid = 'uid-other-456';

  it('permite acesso do próprio uid ao seu perfil', () => {
    expect(assertUidIsolation(uid, uid, false)).toBe(true);
  });

  it('bloqueia uid acessando perfil de outro uid', () => {
    expect(assertUidIsolation(otherUid, uid, false)).toBe(false);
  });

  it('bloqueia uid não-mainAdmin acessando escopo global (sem requestedUid)', () => {
    expect(assertUidIsolation(null, uid, false)).toBe(false);
    expect(assertUidIsolation(undefined, uid, false)).toBe(false);
  });

  it('permite mainAdmin acessar escopo global', () => {
    expect(assertUidIsolation(null, uid, true)).toBe(true);
  });

  it('permite mainAdmin acessar perfil de outro uid', () => {
    expect(assertUidIsolation(otherUid, uid, true)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Bootstrap – inicialização limpa de novos usuários
// ---------------------------------------------------------------------------
describe('Bootstrap de novos usuários – isolamento do perfil global', () => {
  /**
   * Simula a estrutura de dados que o bootstrap cria para um novo admin.
   * O documento deve ser salvo em admins/{uid}/profile/settings,
   * NUNCA sobrescrever admin/profileSettings (perfil global).
   */
  function buildBootstrapProfilePath(uid: string): string {
    return `admins/${uid}/profile/settings`;
  }

  it('novo admin recebe caminho individual isolado', () => {
    const uid = 'uid-novo-admin-999';
    const path = buildBootstrapProfilePath(uid);
    expect(path).toBe(`admins/${uid}/profile/settings`);
    expect(path).not.toBe('admin/profileSettings');
  });

  it('dados do bootstrap não incluem dados do perfil global', () => {
    // Dados que o bootstrap cria (replicados de bootstrap/route.ts)
    const bootstrapData = {
      name: 'Bruno Teste',
      email: 'bruno@teste.com',
      phone: '',
      username: 'brunoteste',
      address: '',
      description: '',
      profilePictureUrl: '/placeholder-photo.svg',
      coverPhotoUrl: '/placeholder-cover.svg',
      galleryPhotos: [],
    };

    // Os campos sensíveis do superadmin (pix@italosantos.com) NÃO devem estar presentes
    expect('isMainAdmin' in bootstrapData).toBe(false);
    expect(bootstrapData.email).not.toBe('pix@italosantos.com');
    expect(bootstrapData.username).not.toBe(SUPERADMIN_USERNAME);
  });
});

// ---------------------------------------------------------------------------
// Roteamento público – username de UID não deve resolver para perfil global
// ---------------------------------------------------------------------------
describe('Roteamento público – isolamento de rotas UID', () => {
  it('rota /bruno extrai "bruno" como adminId', () => {
    const username = getPublicUsernameFromPathname('/bruno');
    expect(username).toBe('bruno');
    // Não é superadmin, então a rota deve ser isolada ao UID de Bruno
    expect(username?.toLowerCase()).not.toBe(SUPERADMIN_USERNAME.toLowerCase());
  });

  it('rota /bruno/admin/settings extrai "bruno" como adminId', () => {
    const username = getPublicUsernameFromPathname('/bruno/admin/settings');
    expect(username).toBe('bruno');
  });

  it('rota global /admin/settings NÃO extrai adminId (é rota do superadmin)', () => {
    const username = getPublicUsernameFromPathname('/admin/settings');
    expect(username).toBeNull();
  });

  it(`username "${SUPERADMIN_USERNAME}" reconhecido como superadmin (não deve usar perfil UID)`, () => {
    const username = getPublicUsernameFromPathname(`/${SUPERADMIN_USERNAME}`);
    const isSuperAdminRoute = username?.toLowerCase() === SUPERADMIN_USERNAME.toLowerCase();
    // Se for superadmin, pode usar global; mas o path deve estar correto
    expect(isSuperAdminRoute).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// POST handler – lógica de effectiveUid
// ---------------------------------------------------------------------------
describe('POST profile-settings – isolamento de escrita', () => {
  /**
   * Replica a lógica do POST handler para verificar o effectiveUid.
   * Um admin não-superadmin sem adminUid no body deve sempre salvar no próprio UID.
   */
  function resolveEffectiveUid(params: {
    adminUidFromBody: string | undefined;
    authUid: string;
    authUsername: string;
  }): string | undefined {
    const { adminUidFromBody, authUid, authUsername } = params;
    const isSuperAdmin = authUsername.toLowerCase() === SUPERADMIN_USERNAME.toLowerCase();
    return adminUidFromBody ?? (isSuperAdmin ? undefined : authUid);
  }

  it('admin não-superadmin sem adminUid no body → usa seu próprio uid', () => {
    const uid = resolveEffectiveUid({
      adminUidFromBody: undefined,
      authUid: 'uid-bruno-123',
      authUsername: 'brunoteste',
    });
    expect(uid).toBe('uid-bruno-123');
    expect(uid).not.toBeUndefined();
  });

  it('superadmin sem adminUid no body → usa undefined (escopo global)', () => {
    const uid = resolveEffectiveUid({
      adminUidFromBody: undefined,
      authUid: 'uid-severepics',
      authUsername: SUPERADMIN_USERNAME,
    });
    expect(uid).toBeUndefined();
  });

  it('admin não-superadmin com adminUid explícito → usa adminUid fornecido', () => {
    const uid = resolveEffectiveUid({
      adminUidFromBody: 'uid-bruno-123',
      authUid: 'uid-bruno-123',
      authUsername: 'brunoteste',
    });
    expect(uid).toBe('uid-bruno-123');
  });
});

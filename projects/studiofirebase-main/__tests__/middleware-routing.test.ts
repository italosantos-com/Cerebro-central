import { middleware } from '../src/middleware';

function createRequest(path: string): any {
  const url = new URL(`https://italosantos.com${path}`);
  return {
    nextUrl: {
      clone: () => new URL(url.toString()),
    },
  };
}

describe('middleware routing', () => {
  it('mantém /:username sem redirecionar para /perfil', () => {
    const response = middleware(createRequest('/bruno'));
    expect(response).toBeTruthy();
    expect(response.headers.get('location')).toBeNull();
  });

  it('continua redirecionando links de ação do Firebase para /auth/action', () => {
    const response = middleware(createRequest('/?mode=verifyEmail&oobCode=abc123'));
    expect(response).toBeTruthy();
    expect(response.headers.get('location')).toContain('/auth/action');
  });

  it('redireciona rota de perfil aninhada para o perfil do outro admin', () => {
    const response = middleware(createRequest('/bruno/severe'));
    expect(response).toBeTruthy();
    expect(response.headers.get('location')).toContain('/severe');
  });

  it.each([
    ['/bruno/severe/fotos', '/severe/fotos'],
    ['/bruno/severe/videos', '/severe/videos'],
    ['/bruno/severe/loja', '/severe/loja'],
    ['/bruno/severe/galeria-assinantes', '/severe/galeria-assinantes'],
    ['/bruno/severe/ajuda', '/severe/ajuda'],
  ])(
    'redireciona %s para a seção pública correspondente %s',
    (fromPath, expectedPath) => {
      const response = middleware(createRequest(fromPath));
      expect(response).toBeTruthy();
      expect(response.headers.get('location')).toContain(expectedPath);
    }
  );
});

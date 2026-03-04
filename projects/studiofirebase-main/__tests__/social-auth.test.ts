import { getSocialLoginErrorMessage } from '@/lib/social-auth';

describe('social-auth', () => {
  it('retorna mensagem amigável para popup bloqueado no Google', () => {
    const message = getSocialLoginErrorMessage({ code: 'auth/popup-blocked' }, 'google');
    expect(message).toContain('Permita pop-ups');
    expect(message).toContain('Google');
  });

  it('retorna fallback para erro desconhecido', () => {
    const message = getSocialLoginErrorMessage({ message: 'erro interno' }, 'apple');
    expect(message).toBe('erro interno');
  });
});

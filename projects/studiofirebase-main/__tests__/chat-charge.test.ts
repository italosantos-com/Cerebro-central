import { getChargeAmountFromMessage } from '@/lib/chat-charge';

describe('getChargeAmountFromMessage', () => {
  it('prioriza chargeAmount numérico válido', () => {
    expect(getChargeAmountFromMessage({ chargeAmount: 1, text: '💰 Cobrança de R$ 9.99' })).toBe(1);
  });

  it('extrai valor textual com ponto decimal (R$ 1.00)', () => {
    expect(getChargeAmountFromMessage({ text: '💰 Cobrança de R$ 1.00 com mídia bloqueada' })).toBe(1);
  });

  it('extrai valor textual com vírgula decimal', () => {
    expect(getChargeAmountFromMessage({ text: '💰 Cobrança de R$ 12,50' })).toBe(12.5);
  });

  it('retorna null quando não encontra valor válido', () => {
    expect(getChargeAmountFromMessage({ text: 'Mensagem comum' })).toBeNull();
  });
});

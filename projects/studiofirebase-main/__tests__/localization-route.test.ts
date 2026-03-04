import { POST } from '@/app/api/localization/route';
import { translateText } from '@/ai/flows/translation-flow';
import { convertCurrency } from '@/ai/flows/currency-conversion-flow';

jest.mock('@/ai/flows/translation-flow', () => ({
  translateText: jest.fn(),
}));

jest.mock('@/ai/flows/currency-conversion-flow', () => ({
  convertCurrency: jest.fn(),
}));

const mockedTranslateText = translateText as jest.MockedFunction<typeof translateText>;
const mockedConvertCurrency = convertCurrency as jest.MockedFunction<typeof convertCurrency>;

describe('POST /api/localization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('retorna 502 quando nenhuma tradução é concluída', async () => {
    mockedTranslateText.mockRejectedValue(new Error('upstream down'));

    const request = new Request('http://localhost/api/localization', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetLanguage: 'en',
        targetLocale: 'en-US',
        baseAmount: 99,
        textBlocks: [
          { id: 'hero.title', text: 'Olá mundo' },
          { id: 'hero.subtitle', text: 'Bem-vindo' },
        ],
      }),
    });

    const response = await POST(request as never);
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload).toEqual({
      error: 'Serviço de tradução indisponível no momento. Tente novamente em instantes.',
    });
  });

  test('retorna 200 quando há ao menos uma tradução válida', async () => {
    mockedTranslateText
      .mockResolvedValueOnce({ translatedText: 'Hello world' })
      .mockRejectedValueOnce(new Error('transient failure'));
    mockedConvertCurrency.mockResolvedValue({
      amount: 20,
      currencyCode: 'USD',
      currencySymbol: '$',
    });

    const request = new Request('http://localhost/api/localization', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetLanguage: 'en',
        targetLocale: 'en-US',
        baseAmount: 99,
        textBlocks: [
          { id: 'hero.title', text: 'Olá mundo' },
          { id: 'hero.subtitle', text: 'Bem-vindo' },
        ],
      }),
    });

    const response = await POST(request as never);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.translations).toEqual([
      { id: 'hero.title', text: 'Hello world' },
      { id: 'hero.subtitle', text: 'Bem-vindo' },
    ]);
    expect(payload.currency).toEqual({
      amount: 20,
      currencyCode: 'USD',
      currencySymbol: '$',
    });
  });
});

import { isGenkitEnabledFromEnv } from '@/ai/genkit-enabled';

describe('isGenkitEnabledFromEnv', () => {
  it('respeita desativação explícita', () => {
    expect(
      isGenkitEnabledFromEnv({
        GENKIT_ENABLED: 'false',
        GOOGLE_GENAI_API_KEY: 'abc',
      } as NodeJS.ProcessEnv)
    ).toBe(false);
  });

  it('ativa quando há API key mesmo sem GENKIT_ENABLED definido', () => {
    expect(
      isGenkitEnabledFromEnv({
        GOOGLE_GENAI_API_KEY: 'abc',
      } as NodeJS.ProcessEnv)
    ).toBe(true);
  });

  it('ativa quando Vertex está habilitado', () => {
    expect(
      isGenkitEnabledFromEnv({
        GOOGLE_GENAI_USE_VERTEXAI: 'true',
      } as NodeJS.ProcessEnv)
    ).toBe(true);
  });

  it('mantém desativado quando não há sinal de configuração', () => {
    expect(isGenkitEnabledFromEnv({} as NodeJS.ProcessEnv)).toBe(false);
  });
});

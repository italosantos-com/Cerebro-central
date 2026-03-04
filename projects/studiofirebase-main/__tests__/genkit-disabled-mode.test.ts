describe('src/ai/genkit disabled fallback', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('mantém defineFlow funcional quando genkit está desativado', async () => {
    process.env.GENKIT_ENABLED = 'false';
    const mod = require('@/ai/genkit');
    const flow = mod.ai.defineFlow({}, async () => 'ok');
    await expect(flow.run({})).resolves.toBe('ok');
  });

  it('entra em fallback sem quebrar quando falha ao inicializar plugins', () => {
    process.env.GENKIT_ENABLED = '';
    process.env.GOOGLE_GENAI_API_KEY = 'fake-key';
    process.env.GENKIT_PROVIDER = 'vertex';

    jest.doMock('genkit', () => ({ genkit: () => ({}) }));
    jest.doMock('@genkit-ai/googleai', () => ({
      googleAI: () => ({}),
      gemini20Flash: 'gemini20Flash',
    }));
    jest.doMock('@genkit-ai/vertexai', () => {
      throw new Error('vertex init failed');
    });

    const mod = require('@/ai/genkit');
    expect(mod.genkitDisabled).toBe(true);
    expect(String(mod.genkitLoadError || '')).toContain('vertex init failed');
  });
});

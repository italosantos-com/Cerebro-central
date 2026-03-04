type CentralAssistant = {
  run: (input: unknown) => Promise<string>;
  name?: string;
  isFallback?: boolean;
  loadError?: string | null;
};

let cached: CentralAssistant | null = null;
let lastLoadError: string | null = null;

async function loadCentralAssistant(): Promise<CentralAssistant> {
  if (cached) return cached;

  try {
    // IMPORTANT: Import from a Next-bundled module (inside src/).
    // Root-level `genkit-flow.js` relies on `./src/...` paths and tends to break in production.
    const mod = await import('@/ai/flows/central-assistant-flow');
    const brain = (mod as any)?.centralAssistantBrain ?? (mod as any)?.default?.centralAssistantBrain;

    if (brain?.run) {
      lastLoadError = null;
      cached = {
        name: brain?.name || 'centralAssistantBrain',
        isFallback: false,
        loadError: null,
        run: async (input: unknown) => brain.run(input),
      };
      return cached;
    }

    throw new Error('centralAssistantBrain export not found in @/ai/flows/central-assistant-flow');
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    lastLoadError = `${err?.code ? `${err.code}: ` : ''}${err?.message || String(error)}`;
    console.warn('[CentralAssistant] Failed to load bundled central assistant flow. Falling back.', {
      error: lastLoadError,
      nodeEnv: process.env.NODE_ENV,
    });

    cached = {
      name: 'centralAssistantBrain',
      isFallback: true,
      loadError: lastLoadError,
      run: async () => 'I cannot process this request right now (System Update).',
    };
    return cached;
  }
}

export function getCentralAssistantDiagnostics() {
  return {
    isFallback: cached?.isFallback === true,
    loadError: cached?.loadError ?? lastLoadError,
  };
}

export const centralAssistantBrain: CentralAssistant = {
  name: 'centralAssistantBrain',
  run: async (input: unknown) => {
    const brain = await loadCentralAssistant();
    return brain.run(input);
  },
};

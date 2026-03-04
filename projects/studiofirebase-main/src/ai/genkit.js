/**
 * Genkit Configuration - Studio Italo Santos (JavaScript)
 * Configuração central do Genkit com Google AI (Gemini)
 */

require('dotenv').config();

const { isGenkitEnabledFromEnv } = require('./genkit-enabled');
const genkitEnabled = isGenkitEnabledFromEnv(process.env);

function createDisabledExports(reason = 'Genkit disabled. Set GENKIT_ENABLED=true and configure Gemini API key or Vertex AI.') {
  const disabledError = () => new Error(reason);
  const disabledGenerate = async () => {
    throw disabledError();
  };
  const disabledDefineFlow = (_config, handler) => {
    const flow = async (input) => {
      if (typeof handler === 'function') return handler(input);
      throw disabledError();
    };
    flow.run = flow;
    return flow;
  };
  const disabledDefinePrompt = () => {
    throw disabledError();
  };
  const disabledDefineTool = (_config, handler) => {
    const tool = async (input) => {
      if (typeof handler === 'function') return handler(input);
      throw disabledError();
    };
    tool.run = tool;
    return tool;
  };

  return {
    ai: {
      generate: disabledGenerate,
      defineFlow: disabledDefineFlow,
      definePrompt: disabledDefinePrompt,
      defineTool: disabledDefineTool,
    },
    models: {},
    generate: disabledGenerate,
    defineFlow: disabledDefineFlow,
    definePrompt: disabledDefinePrompt,
    useVertex: false,
    vertexLocation: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
    genkitDisabled: true,
    genkitLoadError: reason,
  };
}

if (!genkitEnabled) {
  module.exports = createDisabledExports('Genkit disabled');
} else {
  try {
    const { genkit } = require('genkit');
    const googleai = require('@genkit-ai/googleai');
    const vertex = require('@genkit-ai/vertexai');

    const useVertex =
      process.env.GENKIT_PROVIDER === 'vertex' ||
      process.env.GOOGLE_GENAI_USE_VERTEXAI === 'true';

    const vertexLocation =
      process.env.GENKIT_VERTEX_LOCATION ||
      process.env.GOOGLE_CLOUD_LOCATION ||
      'us-central1';

    const plugins = useVertex
      ? [vertex.vertexAI({ location: vertexLocation })]
      : [
          googleai.googleAI({
            apiKey:
              process.env.GOOGLE_GENAI_API_KEY ||
              process.env.GEMINI_API_KEY ||
              process.env.GOOGLE_API_KEY,
          }),
        ];

    // Modelos disponíveis por provider
    const models = {
      fast: useVertex ? vertex.gemini20Flash : googleai.gemini20Flash,
      high: useVertex
        ? (vertex.gemini15Pro || vertex.gemini20Flash)
        : googleai.gemini20Flash,
    };

    const modelTier = process.env.GENKIT_MODEL_TIER || 'fast';
    const defaultModel = modelTier === 'high' ? models.high : models.fast;

    // Inicializar Genkit
    const ai = genkit({
      plugins,
      model: defaultModel,
      enableTracingAndMetrics: false,
    });

    // Exportar funções principais
    const generate = ai.generate.bind(ai);
    const defineFlow = ai.defineFlow.bind(ai);
    const definePrompt = ai.definePrompt.bind(ai);

    module.exports = {
      ai,
      models,
      generate,
      defineFlow,
      definePrompt,
      useVertex,
      vertexLocation,
      genkitDisabled: false,
    };
  } catch (error) {
    const reason = `Genkit initialization failed: ${error?.message || String(error)}`;
    console.warn('[Genkit] Initialization failed, running in disabled mode.', { reason });
    module.exports = createDisabledExports(reason);
  }
}

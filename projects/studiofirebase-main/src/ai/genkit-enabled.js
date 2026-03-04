function isTrue(value) {
  return typeof value === 'string' && value.trim().toLowerCase() === 'true';
}

function isFalse(value) {
  return typeof value === 'string' && value.trim().toLowerCase() === 'false';
}

function isGenkitEnabledFromEnv(env = process.env) {
  const explicitToggle = env.GENKIT_ENABLED;
  if (isTrue(explicitToggle)) return true;
  if (isFalse(explicitToggle)) return false;

  const hasGeminiApiKey = Boolean(
    env.GOOGLE_GENAI_API_KEY ||
    env.GEMINI_API_KEY ||
    env.GOOGLE_API_KEY
  );
  const useVertex =
    env.GENKIT_PROVIDER === 'vertex' ||
    isTrue(env.GOOGLE_GENAI_USE_VERTEXAI);

  return hasGeminiApiKey || useVertex;
}

module.exports = { isGenkitEnabledFromEnv };

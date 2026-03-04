# 🤖 Genkit AI - Studio Italo Santos

Integração do Firebase Genkit com Google Gemini AI.

## 📋 Sobre

O Genkit é um framework da Google para desenvolvimento de aplicações com IA. Neste projeto, está integrado com o Gemini 1.5 Flash para geração de texto, análise de sentimento, e muito mais.

## 🚀 Configuração

### 1. Instalar Dependências

```bash
npm install genkit @genkit-ai/core @genkit-ai/googleai @genkit-ai/ai zod --save --legacy-peer-deps
```

### 2. Configurar API Key

Adicione ao `.env.local`:

```bash
GEMINI_API_KEY=sua_api_key_aqui
# ou
GOOGLE_API_KEY=sua_api_key_aqui
```

**Obter API Key:**
https://makersuite.google.com/app/apikey

### 3. Testar

```bash
npm run dev
```

Acesse: http://localhost:3000/genkit-test

## 📁 Estrutura

```
src/
├── ai/
│   └── genkit.ts              # Configuração central do Genkit
├── app/
│   ├── api/
│   │   └── ai/
│   │       └── generate/
│   │           └── route.ts   # API endpoint para geração de texto
│   └── genkit-test/
│       └── page.tsx           # Página de teste
└── firebase-genkit/
    └── index.ts               # Flows avançados (opcional)
```

## 🎯 Uso Básico

### Gerar Texto

```typescript
import { ai, gemini15Flash } from '@/ai/genkit';

const { text } = await ai.generate({
  model: gemini15Flash,
  prompt: 'Escreva um post sobre tecnologia',
  config: {
    temperature: 0.7,
    maxOutputTokens: 500,
  },
});

console.log(text);
```

### Via API

```bash
curl -X POST http://localhost:3000/api/ai/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Escreva um post sobre tecnologia",
    "temperature": 0.7,
    "maxTokens": 500
  }'
```

## 🔧 Flows Disponíveis

### 1. Suggestion Flow
Gera 3 sugestões de resposta para uma mensagem.

```typescript
import { runSuggestions } from '@/firebase-genkit';

const result = await runSuggestions('Olá, como vai?');
console.log(result.suggestions); // ['Tudo bem!', 'Ótimo!', 'E você?']
```

### 2. Sentiment Analysis
Analisa o sentimento de um texto.

```typescript
import { analyzeSentiment } from '@/firebase-genkit';

const result = await analyzeSentiment('Hoje foi um dia maravilhoso!');
console.log(result.sentiment); // 'positive'
console.log(result.confidence); // 0.95
```

### 3. Content Generation
Gera conteúdo criativo.

```typescript
import { generateContent } from '@/firebase-genkit';

const result = await generateContent(
  'Desenvolvimento Web',
  'post',
  200
);
console.log(result.content);
```

### 4. Chat
Chat simples com contexto.

```typescript
import { chat } from '@/firebase-genkit';

const result = await chat('Qual a capital do Brasil?', [
  { role: 'user', content: 'Olá!' },
  { role: 'assistant', content: 'Olá! Como posso ajudar?' }
]);
console.log(result.response);
```

## 🌐 Endpoints da API

### `GET /api/ai/generate`
Verifica status do Genkit.

**Resposta:**
```json
{
  "status": "ok",
  "service": "Genkit AI",
  "model": "gemini-1.5-flash",
  "configured": true,
  "message": "Genkit configurado e pronto para uso"
}
```

### `POST /api/ai/generate`
Gera texto com Gemini.

**Request:**
```json
{
  "prompt": "string",
  "temperature": 0.7,
  "maxTokens": 500
}
```

**Response:**
```json
{
  "success": true,
  "text": "Texto gerado...",
  "model": "gemini-1.5-flash",
  "config": {
    "temperature": 0.7,
    "maxTokens": 500
  }
}
```

## 📖 Modelos Disponíveis

- **`gemini15Flash`** - Rápido e eficiente (padrão)
- **`gemini15Pro`** - Mais poderoso e preciso

```typescript
import { ai, gemini15Pro } from '@/ai/genkit';

const { text } = await ai.generate({
  model: gemini15Pro, // Usar modelo Pro
  prompt: 'Análise complexa...',
});
```

## ⚙️ Configurações

### Temperature
Controla a criatividade (0.0 - 1.0)
- `0.0` = Mais determinístico
- `1.0` = Mais criativo

### Max Output Tokens
Número máximo de tokens na resposta
- Padrão: 500
- Máximo: 8192

### Exemplo:
```typescript
const { text } = await ai.generate({
  model: gemini15Flash,
  prompt: 'Conte uma história curta',
  config: {
    temperature: 0.9,  // Mais criativo
    maxOutputTokens: 1000, // Mais longo
  },
});
```

## 🧪 Testar

### Página de Teste
http://localhost:3000/genkit-test

### CLI Genkit (opcional)
```bash
npx genkit start
```

Abre interface visual em: http://localhost:4000

## 📚 Documentação

- **Genkit:** https://firebase.google.com/docs/genkit
- **Gemini:** https://ai.google.dev/docs
- **API Reference:** https://firebase.google.com/docs/genkit/api

## 🐛 Troubleshooting

### Erro: "GEMINI_API_KEY não configurada"
- Adicione `GEMINI_API_KEY` no `.env.local`
- Obtenha em: https://makersuite.google.com/app/apikey

### Erro: "Module not found"
```bash
npm install --legacy-peer-deps
```

### Build Error
Certifique-se que `firebase-genkit` não está em `exclude` no `tsconfig.json`.

## 💡 Exemplos de Uso

### Blog Post Generator
```typescript
const post = await ai.generate({
  model: gemini15Flash,
  prompt: 'Escreva um post de blog sobre Next.js 14',
  config: { temperature: 0.8 },
});
```

### Code Review
```typescript
const review = await ai.generate({
  model: gemini15Pro,
  prompt: `Revise este código:
  
\`\`\`typescript
${code}
\`\`\``,
  config: { temperature: 0.3 },
});
```

### Tradução
```typescript
const translation = await ai.generate({
  model: gemini15Flash,
  prompt: `Traduza para inglês: ${textoPortugues}`,
  config: { temperature: 0.2 },
});
```

---

**Criado por:** Studio Italo Santos  
**Projeto:** YOUR_FIREBASE_PROJECT_ID  
**Versão:** 1.0.0

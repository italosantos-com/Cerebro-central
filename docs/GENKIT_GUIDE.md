# 🤖 Firebase Genkit - Guia de Uso

## 📋 O que é Genkit?

Firebase Genkit é um framework da Google para desenvolvimento de aplicações com IA. Ele facilita a integração com modelos de linguagem como o Gemini AI.

## 🚀 Configuração

### 1. Variáveis de Ambiente

Adicione ao `.env.local`:

```bash
# Google Gemini API Key
GEMINI_API_KEY=AIzaSyCdAiPmVncp6PmLDfjWZGvR0uLYm6VCXOk
```

### 2. Dependências Instaladas

```bash
✅ @genkit-ai/core
✅ @genkit-ai/googleai  
✅ @genkit-ai/ai
✅ genkit
✅ zod
```

## 🎯 Flows Disponíveis

### 1. **Suggestion Flow** 💡
Gera 3 sugestões de resposta para uma mensagem.

```typescript
import { runSuggestions } from '@/../../firebase-genkit';

const result = await runSuggestions('Obrigado pela sua mensagem!');
// Output: { suggestions: ['De nada!', 'Fico feliz em ajudar!', 'Sempre à disposição!'] }
```

### 2. **Sentiment Analysis** 😊😐😞
Analisa o sentimento de um texto.

```typescript
import { analyzeSentiment } from '@/../../firebase-genkit';

const result = await analyzeSentiment('Estou muito feliz com este produto!');
// Output: {
//   sentiment: 'positive',
//   confidence: 0.95,
//   explanation: 'Texto expressa felicidade e satisfação'
// }
```

### 3. **Content Generation** ✍️
Gera conteúdo criativo (posts, captions, descriptions).

```typescript
import { generateContent } from '@/../../firebase-genkit';

const result = await generateContent('Fotografia profissional', 'post', 200);
// Output: {
//   content: '📸 A fotografia profissional captura momentos únicos...'
// }
```

### 4. **Chat** 💬
Chat com IA mantendo contexto.

```typescript
import { chat } from '@/../../firebase-genkit';

const result = await chat('Qual é o clima hoje?', [
  { role: 'user', content: 'Olá!' },
  { role: 'assistant', content: 'Olá! Como posso ajudar?' }
]);
// Output: { response: 'Eu não tenho acesso a informações...' }
```

## 🌐 API REST

### Endpoint: `POST /api/genkit`

#### 1. Sugestões
```bash
curl -X POST http://localhost:3000/api/genkit \
  -H "Content-Type: application/json" \
  -d '{
    "action": "suggestions",
    "message": "Obrigado!"
  }'
```

#### 2. Análise de Sentimento
```bash
curl -X POST http://localhost:3000/api/genkit \
  -H "Content-Type: application/json" \
  -d '{
    "action": "sentiment",
    "text": "Estou muito feliz!"
  }'
```

#### 3. Geração de Conteúdo
```bash
curl -X POST http://localhost:3000/api/genkit \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate",
    "topic": "Fotografia",
    "type": "post",
    "maxLength": 200
  }'
```

#### 4. Chat
```bash
curl -X POST http://localhost:3000/api/genkit \
  -H "Content-Type: application/json" \
  -d '{
    "action": "chat",
    "message": "Olá!",
    "history": []
  }'
```

## 🧪 Página de Teste

Acesse: **http://localhost:3000/genkit-test**

Interface interativa para testar todos os flows!

## 📁 Estrutura de Arquivos

```
firebase-genkit/
└── index.ts          ← Configuração e flows

src/app/
├── api/
│   └── genkit/
│       └── route.ts  ← API REST
└── genkit-test/
    └── page.tsx      ← Página de teste
```

## 🔧 Desenvolvimento

### Adicionar Novo Flow

```typescript
import { defineFlow } from '@genkit-ai/flow';
import { generate } from '@genkit-ai/ai';
import * as z from 'zod';

export const myCustomFlow = defineFlow(
  {
    name: 'myCustomFlow',
    inputSchema: z.object({
      input: z.string(),
    }),
    outputSchema: z.object({
      output: z.string(),
    }),
  },
  async (input) => {
    const result = await generate({
      model: 'googleai/gemini-pro',
      prompt: `Seu prompt aqui: ${input.input}`,
      config: {
        temperature: 0.7,
        maxOutputTokens: 500,
      },
    });

    return { output: result.text() };
  }
);
```

## 💰 Custos

### Google Gemini API Pricing:
- **Gemini Pro:** Grátis até 60 req/min
- **Gemini Pro Vision:** Grátis até 60 req/min

Mais informações: https://ai.google.dev/pricing

## 📚 Documentação

- **Firebase Genkit:** https://firebase.google.com/docs/genkit
- **Google AI Studio:** https://makersuite.google.com/
- **Gemini API:** https://ai.google.dev/

## 🐛 Troubleshooting

### Erro: "API Key not found"
```bash
# Verifique se a chave está no .env.local
GEMINI_API_KEY=sua_chave_aqui
```

### Erro: "Rate limit exceeded"
O Gemini Pro tem limite de 60 requisições por minuto. Aguarde ou implemente retry logic.

### Erro: "Module not found"
```bash
npm install @genkit-ai/core @genkit-ai/googleai @genkit-ai/ai genkit zod --legacy-peer-deps
```

## ✅ Checklist

- [x] Genkit instalado
- [x] API Key configurada
- [x] 4 Flows criados
- [x] API REST funcionando
- [x] Página de teste criada
- [ ] Testar cada flow
- [ ] Integrar com a aplicação

---

**Desenvolvido com Firebase Genkit + Google Gemini AI** 🚀

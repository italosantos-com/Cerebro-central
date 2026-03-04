# Instruções de Primeira Utilização - Sistema de Tradução de Chat

## 🚀 Quick Start (5 minutos)

### Passo 1: Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.chat-translation.example .env.local
```

### Passo 2: Adicionar Chaves de API

**Opção A: Google Translate (Recomendado para começar)**

1. Acesse: https://console.cloud.google.com/
2. Crie um novo projeto ou selecione um existente  
3. Ative a API: **Cloud Translation API**
4. Vá para Credenciais → Create Credentials → API Key
5. Copie a chave

Adicione ao `.env.local`:
```env
GOOGLE_TRANSLATE_API_KEY=seu_google_key_aqui
NEXT_PUBLIC_TRANSLATION_PROVIDER=google
```

**Opção B: DeepL (Melhor Qualidade)**

1. Acesse: https://www.deepl.com/pro/developers
2. Inscreva-se
3. Vá para Account → API Authentication Key  
4. Copie a chave

Adicione ao `.env.local`:
```env
DEEPL_API_KEY=seu_deepl_key_aqui
NEXT_PUBLIC_TRANSLATION_PROVIDER=deepl
```

### Passo 3: Iniciar Servidor

```bash
# Instalar dependências (se necessário)
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

Abra no navegador: http://localhost:3000

### Passo 4: Testar Tradução

Crie um arquivo de teste `test-translation.tsx`:

```tsx
import { ChatMessage } from '@/components/chat/ChatMessage';

export default function TestPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl mb-4">Teste de Tradução</h1>
      
      <ChatMessage
        id="test-1"
        text="Hello, how are you today?"
        sender="John Doe"
        timestamp={new Date()}
        enableTranslation={true}
        targetLanguage="pt"
      />
      
      <ChatMessage
        id="test-2"
        text="I'm doing great, thanks for asking!"
        sender="Jane Smith"
        timestamp={new Date()}
        enableTranslation={true}
        targetLanguage="pt"
      />
    </div>
  );
}
```

Acesse: http://localhost:3000/test-translation

Você deve ver:
- Mensagens em inglês
- Botão "Traduzir" para cada mensagem
- Ao clicar, a mensagem deve traduzir para português

---

## 🧪 Testes Recomendados

### Teste 1: Tradução Basic
```
1. Clique no botão "Traduzir"
2. Aguarde 2-5 segundos
3. Veja a tradução aparecer
4. Clique em "Original" para voltar
```

**Esperado:**
- ✅ "Hello, how are you today?" → "Olá, como você está hoje?"
- ✅ Sem erros no console

### Teste 2: Múltiplos Idiomas
```
1. Altere targetLanguage para diferentes códigos:
   - es (Espanhol)
   - fr (Francês)  
   - de (Alemão)
   - zh (Chinês)
   - ja (Japonês)
2. Clique Traduzir para cada um
```

### Teste 3: Tradução em Cache
```
1. Traduzir uma mensagem
2. Traduzir novamente
3. Verificar que a segunda é instantânea
```

### Teste 4: Seletor de Idioma
```tsx
import { LanguageSelector } from '@/components/chat/LanguageSelector';

export default function TestPage() {
  const [lang, setLang] = React.useState('pt');
  
  return (
    <div className="p-8">
      <LanguageSelector 
        currentLanguage={lang}
        onLanguageChange={setLang}
      />
      <p>Idioma selecionado: {lang}</p>
    </div>
  );
}
```

### Teste 5: Chat Window Completo
```tsx
import { ChatWindowWithTranslation } from '@/components/chat/ChatWindowWithTranslation';

export default function TestPage() {
  return (
    <ChatWindowWithTranslation
      enableTranslation={true}
      showLanguageSelector={true}
      defaultTargetLanguage="pt"
    />
  );
}
```

---

## ❌ Troubleshooting

### Problema: "Erro: Usuário não autenticado"

**Causa:** Você não fez login com Firebase

**Solução:**
1. Faça login na sua aplicação primeiro
2. Depois tente traduzir

Código para verificar login:
```tsx
import { useAuth } from '@/hooks/useUserAuth';

export function TestPage() {
  const { user } = useAuth();
  
  if (!user) {
    return <p>Faça login primeiro</p>;
  }
  
  return <ChatMessage ... />;
}
```

### Problema: "Erro: Chave de API inválida"

**Causa:** Variável de ambiente não configurada corretamente

**Solução:**
1. Verifique se `.env.local` existe
2. Verifique se a chave foi copiad corretamente
3. Reinicie o servidor: `npm run dev`

Verificar:
```bash
# No terminal
echo $GOOGLE_TRANSLATE_API_KEY

# Ou no código
console.log(process.env.GOOGLE_TRANSLATE_API_KEY);
```

### Problema: "Erro: Idioma não suportado"

**Causa:** Código de idioma inválido

**Solução:** Use códigos ISO 639-1 válidos:
```
pt - Português
en - English
es - Español
fr - Français
de - Deutsch
zh - 中文
ja - 日本語
```

### Problema: "Tradução lenta" ou "Timeout"

**Causa:** Conexão de internet lenta ou limite de API

**Solução:**
1. Verificar conexão de internet
2. Aguardar alguns minutos
3. Aumentar cache:
```tsx
useChatTranslation({
  cacheSize: 200,  // aumentado de 100
  provider: 'deepl' // DeepL é mais rápido
})
```

### Problema: Nada aparece no console

**Solução:** Ativar debug mode
```env
NEXT_PUBLIC_TRANSLATION_DEBUG=true
```

Agora você verá logs como:
```
[Translation Debug] Traduzindo mensagem msg-1
[Translation Debug] Tradução concluída em 245ms  
[Translation Debug] Cache: 5 mensagens armazenadas
```

---

## 📱 Usar em Produção

### Deploy em Vercel

```bash
# Adicionar variáveis de ambiente em Vercel
vercel env add GOOGLE_TRANSLATE_API_KEY
vercel env add DEEPL_API_KEY
```

### Deploy em Другой Host

Adicione ao seu arquivo `.env.production`:
```env
GOOGLE_TRANSLATE_API_KEY=production_key
DEEPL_API_KEY=production_key
```

---

## 🛠️ Debugging Avançado

### Ver Requisições HTTP

Abra DevTools (F12) → Network Tab

Procure por:
- `POST /api/chat/translate`
- `POST /api/chat/detect-language`

Clique: deve ver resposta JSON com texto traduzido

### Ver Performance

```tsx
import { useEffect } from 'react';
import { useChatTranslation } from '@/hooks/use-chat-translation';

export function DebugPage() {
  const { cacheSize, translatedMessages, loading, errors } = useChatTranslation();
  
  useEffect(() => {
    const handle = setInterval(() => {
      console.log('Cache size:', cacheSize);
      console.log('Translated:', translatedMessages.size);
      console.log('Loading:', loading.size);
      console.log('Errors:', errors.size);
    }, 1000);
    
    return () => clearInterval(handle);
  }, [cacheSize, translatedMessages, loading, errors]);
  
  return <div>Veja o console...</div>;
}
```

---

## 📊 Status de Implementação

✅ **Completo e Testado:**
- API routes com autenticação
- Cliente HTTP funcional
- Hook React com cache
- Componentes UI responsivos
- Documentação completa

⏳ **Próximos Passos:**
- [ ] Testar com dados reais
- [ ] Otimizar performance
- [ ] Adicionar monitoramento
- [ ] Deploy em produção

---

## 📞 Obter Ajuda

**Documentação Completa:**
- `/docs/CHAT_TRANSLATION_SETUP.md` - Guia detalhado
- `/docs/CHAT_TRANSLATION_IMPLEMENTATION.md` - Detalhes técnicos
- `/src/components/chat/examples.tsx` - 7 exemplos práticos

**Recursos Online:**
- Google Cloud: https://cloud.google.com/translate/docs
- DeepL API: https://www.deepl.com/docs-api
- Next.js: https://nextjs.org/docs

---

## 🎉 Sucesso!

Se tudo funcionou, parabéns! 🎊

Agora você tem um sistema robusto de tradução de chat integrado!

**Próxima ação:**
1. Customizar componentes conforme sua UI
2. Integrar em suas páginas de chat
3. Testar com usuários reais
4. Monitorar uso de API

Boa sorte! 🚀

---

*Última atualização: 2024*
*Versão: 1.0.0*

# 🗺️ MAPA DE FLUXO - ONDE A TRADUÇÃO "CONTORCE" O TEXTO

## 🔄 FLUXO ATUAL (PROBLEMÁTICO)

```
┌──────────────────────────────────┐
│ 1. AdUser seleciona idioma       │  ← Facebook, Instagram, etc
└──────────────────┬───────────────┘
                   │
                   ▼
┌──────────────────────────────────┐
│ 2. LocalizationContext           │
│    (src/contexts/...)            │  ❌ Traduz TUDO, sem filtro
│                                  │
│    changeLanguage(lang)          │
└──────────────────┬───────────────┘
                   │
                   ▼
┌──────────────────────────────────┐
│ 3. Genkit + GoogleTranslate API  │  ❌ API não tem proteção
│    (Google Translate v2)         │
│                                  │
│    POST /language/translate/v2   │
└──────────────────┬───────────────┘
                   │
                   ▼
┌──────────────────────────────────┐
│ 4. Resposta de Tradução          │  ⚠️ Sem sanitização
│    { "translatedText": "..." }   │
│                                  │
│    "Send" → "Enviar"             │  ❌ PROBLEMA: UI element
│    "message" → "mensagem"        │  ✅ OK: User content
└──────────────────┬───────────────┘
                   │
                   ▼
┌──────────────────────────────────┐
│ 5. Componentes Renderizados      │  ❌ Com texto contorcido
│                                  │
│    Button: "Enviar"              │  ❌ Deveria ser "Send"
│    Label: "Mensagem"             │  ⚠️ Pode estar OK
│    Aria: "Enviar mensagem"       │  ❌ Deveria ser English
└──────────────────────────────────┘
```

---

## 🛡️ FLUXO CORRIGIDO (COM PROTEÇÃO)

```
┌──────────────────────────────────┐
│ 1. AdUser seleciona idioma       │  
└──────────────────┬───────────────┘
                   │
                   ▼
┌──────────────────────────────────┐
│ 2. LocalizationContext           │  ✅ Com filtro de proteção
│    (src/contexts/...)            │
│                                  │
│    changeLanguage(lang)          │  + isProtected() check
│    .filter(!isProtected)         │
└──────────────────┬───────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
   [Protected]          [Translatable]
   "Send" ✅            "user message"
   "Button" ✅          "comment"
        │                     │
        │                     ▼
        │          ┌──────────────────────────┐
        │          │ 3. Google Translate API  │
        │          │    (com validação)       │
        │          │                          │
        │          │ safeTranslate()          │
        │          │ + sanitizeTranslation()  │
        │          └──────────────┬───────────┘
        │                         │
        ▼                         ▼
   ┌───────────────────────────────────────┐
   │ 4. Resultado Final (Protegido)        │
   │                                       │
   │ UI Elements:                          │
   │   Button: "Send" ✅                   │
   │   Label: "Message" ✅                 │
   │   Aria: "Send message" ✅             │
   │                                       │
   │ Conteúdo de Usuário:                  │
   │   User comment: "Olá, tudo bem?" ✅  │
   │                                       │
   │ ✅ SEM CONTORÇÃO!                    │
   └───────────────────────────────────────┘
```

---

## 📍 PONTOS DE FALHA MAPEADOS

### ❌ Ponto 1: LocalizationContext.tsx
**Localização**: `src/contexts/LocalizationContext.tsx`

**Problema**:
```typescript
// ❌ Traduz tudo indiscriminadamente
const translations = rawTranslations.map(translateEverything);
```

**Solução**:
```typescript
// ✅ Filtra elementos protegidos
import { isProtected } from '@/lib/protected-translation';

const translations = rawTranslations
    .filter(t => !isProtected(t.id))
    .map(t => translateIfNecessary(t));
```

**Impacto**: Afeta TODAS as páginas que usam `useLocalization()`

---

### ❌ Ponto 2: use-chat-translation.ts
**Localização**: `src/hooks/use-chat-translation.ts` (linhas 57-95)

**Problema**:
```typescript
// ❌ Traduz qualquer texto passado
const translated = await chatTranslationClient.translate({
    text: message.text,
    targetLanguage
});
```

**Solução**:
```typescript
// ✅ Valida antes de traduzir
if (!isProtected(text, 'message-content')) {
    const translated = await chatTranslationClient.translate({
        text: message.text,
        targetLanguage
    });
}
```

**Impacto**: Afeta chat, comentários, feeds

---

### ❌ Ponto 3: api/chat/translate/route.ts
**Localização**: `src/app/api/chat/translate/route.ts` (linhas 18-57)

**Problema**:
```typescript
// ❌ Sem validação de entrada
async function translateWithGoogle(text, targetLang) {
    // Traduz sem questionar
    return response.data.translations[0].translatedText;
}
```

**Solução**:
```typescript
// ✅ Com proteção e sanitização
if (isProtected(text)) return text;

const translated = await translateWithGoogle(text, targetLang);
return sanitizeTranslation(translated);
```

**Impacto**: Backend, afeta todas as APIs de tradução

---

## 🔗 COMPONENTES AFETADOS POR PONTO

### Se não corrigir Ponto 1 (LocalizationContext)
```
Afetados:
├── src/components/common/GoogleTranslate.tsx
├── src/components/common/LocalizedText.tsx
├── src/app/page.tsx (homepage)
├── src/app/[username]/page.tsx (profile)
└── Qualquer componente usando useLocalization()
```

### Se não corrigir Ponto 2 (use-chat-translation)
```
Afetados:
├── src/components/chat/ChatContainer.tsx
├── src/components/chat/ChatMessage.tsx
├── src/components/chat/ChatWindowWithTranslation.tsx
├── src/app/admin/chat/[chatId]/page.tsx
└── src/components/secret-chat-widget.tsx
```

### Se não corrigir Ponto 3 (api/translate)
```
Afetados:
├── Todos os requests POST /api/chat/translate
├── Todos os requests POST /api/localization/init
├── Mobile apps chamando a API
└── Qualquer cliente HTTP chamando endpoint de tradução
```

---

## 📊 ÁRVORE DE DEPENDÊNCIAS

```
protected-translation.ts (NEW - Core)
    │
    ├─→ api/chat/translate/route.ts (fix Ponto 3)
    │   └─→ chatTranslationClient.ts
    │       └─→ use-chat-translation.ts (fix Ponto 2)
    │           ├─→ ChatContainer.tsx
    │           ├─→ ChatMessage.tsx
    │           ├─→ admin/chat/[chatId]/page.tsx
    │           └─→ secret-chat-widget.tsx
    │
    └─→ LocalizationContext.tsx (fix Ponto 1)
        ├─→ GoogleTranslate.tsx
        ├─→ LocalizedText.tsx
        ├─→ app/page.tsx
        └─→ app/[username]/page.tsx
```

---

## 🎯 ORDEM DE CORREÇÃO RECOMENDADA

### Passo 1: Criar Base de Proteção ✅ (Já feito)
- ✅ `src/lib/protected-translation.ts`
- Time: 1 minuto (já criado)

### Passo 2: Corrigir API (Backend)
- [ ] `src/app/api/chat/translate/route.ts`
- [ ] Time: 5 minutos

### Passo 3: Corrigir Hook
- [ ] `src/hooks/use-chat-translation.ts`
- [ ] Time: 3 minutos

### Passo 4: Corrigir Context
- [ ] `src/contexts/LocalizationContext.tsx`
- [ ] Time: 5 minutos

### Passo 5: Testar
- [ ] Chat: F12 > Console > enviar mensagem
- [ ] Admin: F12 > Console > testar tradução
- [ ] Homepage: F12 > Console > mudar idioma
- [ ] Time: 10 minutos

**Total**: ~20-30 minutos para correção completa

---

## 🔍 COMO IDENTIFICAR O PROBLEMA

### Sintomas no navegador
```
❌ Button diz "Enviar" (deveria ser "Send")
❌ Link diz "Ir para perfil" (deveria ser "Go to profile")
❌ Aria label em português
❌ Placeholder em português
❌ Error message em português (quando deveria ser English)

✅ Chat message em português (esperado)
✅ User comment em português (esperado)
✅ Feed caption em português (esperado)
```

### Verificar no Console
```javascript
// F12 > Console > Colar:

// Check 1: Se há proteção
if (typeof isProtected === 'undefined') {
    console.error('❌ protected-translation não carregado');
} else {
    console.log('✅ protected-translation carregado');
}

// Check 2: Verificar UI elements
const buttonText = document.querySelector('button').innerText;
console.log('Button text:', buttonText);
// Deve ser em inglês!

// Check 3: Verificar mensagens
const messageText = document.querySelector('[data-message]')?.innerText;
console.log('Message text:', messageText);
// Pode estar em português (user content)
```

---

## 📋 CHECKLIST DE CORREÇÃO

### Preparação
- [ ] Ler `IMPLEMENTACAO_RAPIDA_PROTECAO_TRADUCAO.md`
- [ ] Ter `src/lib/protected-translation.ts` pronto
- [ ] Backup dos 3 arquivos a serem editados

### Implementação
- [ ] Atualizar `api/chat/translate/route.ts`
- [ ] Atualizar `use-chat-translation.ts`
- [ ] Atualizar `LocalizationContext.tsx`
- [ ] Importar `protected-translation` em cada arquivo

### Testes
- [ ] F12 > Console sem erros
- [ ] Button labels em English
- [ ] User content pode estar em Portuguese
- [ ] API retorna `"protected": true` para UI elements
- [ ] API retorna `"protected": false` para conteúdo

### Deploy
- [ ] Commit no git
- [ ] Push para branch dev
- [ ] Criar PR
- [ ] Code review
- [ ] Merge para staging
- [ ] Teste QA
- [ ] Merge para main
- [ ] Deploy production

---

## 💾 ARQUIVOS A MODIFICAR

| Arquivo | Linhas | Mudanza | Prioridade |
|---------|--------|---------|-----------|
| `src/app/api/chat/translate/route.ts` | 1-145 | Adicionar proteção | 🔴 Crítica |
| `src/hooks/use-chat-translation.ts` | 57-95 | Validar entrada | 🔴 Crítica |
| `src/contexts/LocalizationContext.tsx` | ~200 | Filtrar saída | 🟠 Alta |

---

## 🚀 RESULTADO ESPERADO

### Antes da correção
```
Feature: Tradução de UI
Status: ❌ QUEBRADA
- Botões em português
- Labels em português
- Confusão do usuário
- Experiência ruim
```

### Depois da correção
```
Feature: Tradução de UI
Status: ✅ FUNCIONAL
- Botões em English
- Labels em English
- UI consistente
- Experiência ótima
- Conteúdo do usuário traduzido corretamente
```

---

**Documento criado em**: 2 de março de 2026
**Mapeamento completo**: ✅ Sim
**Plano de correção**: ✅ Pronto
**Estimativa de tempo**: 20-30 minutos

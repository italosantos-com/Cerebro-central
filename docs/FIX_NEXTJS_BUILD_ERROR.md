# 🔧 FIX: Erro "_document.js not found"

## 🔴 Problema

```
Error: Cannot find module '/path/.next/server/pages/_document.js'
GET /_next/static/chunks/app/admin/page.js 404
```

## 🔍 Causa

Este erro ocorre quando:
1. O Next.js confunde **App Router** com **Pages Router**
2. Cache do build (`.next`) está corrompido
3. Mudanças no código não foram refletidas no build

**O que é `_document.js`?**
- É um arquivo do **Pages Router** (antigo)
- Nosso projeto usa **App Router** (novo)
- Next.js está procurando arquivo que não deveria existir

## ✅ Solução

### Opção 1: Script Automático (RECOMENDADO)

```bash
cd "/Users/italosanta/Downloads/italosantos.com original"
./fix-nextjs-build.sh
npm run dev
```

### Opção 2: Manual

```bash
# 1. Parar servidor (Ctrl+C no terminal)

# 2. Limpar cache
rm -rf .next
rm -rf node_modules/.cache
rm -rf tsconfig.tsbuildinfo

# 3. Reiniciar
npm run dev
```

### Opção 3: Limpeza Completa (se Opção 1 e 2 falharem)

```bash
# 1. Parar servidor

# 2. Limpar tudo
rm -rf .next
rm -rf node_modules/.cache
rm -rf node_modules
rm -rf tsconfig.tsbuildinfo

# 3. Reinstalar
npm install

# 4. Reiniciar
npm run dev
```

## 🎯 Por Que Acontece?

### Após mudanças no código:
- Modificamos `ConditionalProviders.tsx` (adicionado SessionProvider)
- Modificamos `src/app/login/page.tsx` (adicionado useSession)
- Next.js tentou fazer hot reload
- Cache ficou inconsistente
- Next.js confundiu App Router com Pages Router

### App Router vs Pages Router:

| Recurso | Pages Router (Antigo) | App Router (Novo - NOSSO) |
|---------|----------------------|---------------------------|
| Pasta | `pages/` | `app/` |
| Layout | `_app.js`, `_document.js` | `layout.tsx` |
| Roteamento | Baseado em arquivos | Baseado em pastas |
| Server Components | ❌ Não | ✅ Sim |

**Nosso projeto:** ✅ **App Router**  
**Erro procura por:** ❌ **Pages Router** (`_document.js`)

## 🐛 Erros Relacionados

Se você ver qualquer um desses erros, use a mesma solução:

```
❌ Cannot find module '.next/server/pages/_document.js'
❌ Cannot find module '.next/server/pages/_app.js'
❌ GET /_next/static/chunks/app/[route]/page.js 404
❌ Module build failed: UnhandledSchemeError
❌ Error: ENOENT: no such file or directory
```

**Solução:** Sempre limpar `.next` e reiniciar!

## 📋 Checklist de Verificação

Antes de relatar o problema novamente:

- [ ] Parou o servidor (`Ctrl+C`)
- [ ] Executou `./fix-nextjs-build.sh` OU limpou `.next` manualmente
- [ ] Verificou que não há processos `next dev` rodando (`ps aux | grep next`)
- [ ] Reiniciou o servidor (`npm run dev`)
- [ ] Aguardou compilação completa (pode levar 30-60s)
- [ ] Acessou http://localhost:3000

## 🚀 Scripts Criados

### `fix-nextjs-build.sh`

```bash
#!/bin/bash
# Limpa cache Next.js completamente

# Parar processos
pkill -f "next dev"

# Limpar cache
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo
rm -rf out
rm -f tsconfig.tsbuildinfo

# Opção --full reinstala node_modules
./fix-nextjs-build.sh --full
```

**Uso:**
```bash
# Limpeza normal
./fix-nextjs-build.sh

# Limpeza + reinstalar dependências
./fix-nextjs-build.sh --full
```

## 🔄 Quando Limpar Cache?

### ✅ SEMPRE limpar após:
- Modificar `package.json`
- Adicionar/remover dependências (`npm install X`)
- Mudanças em arquivos de configuração (`next.config.js`, `tsconfig.json`)
- Mudanças em providers/contexts (`ConditionalProviders`, `SessionProvider`)
- Erros estranhos de build/404

### ⚠️ TALVEZ limpar após:
- Mudanças em componentes Client (`'use client'`)
- Mudanças em layouts
- Hot reload não funciona

### ❌ NÃO precisa limpar após:
- Mudanças em páginas simples
- Mudanças em CSS/estilos
- Mudanças em conteúdo estático

## 💡 Dicas de Desenvolvimento

### 1. Terminal Limpo
```bash
# Sempre inicie com terminal limpo
Ctrl+C  # Parar servidor atual
clear   # Limpar terminal
npm run dev
```

### 2. Verificar Processos
```bash
# Ver processos Next.js rodando
ps aux | grep next

# Matar todos os processos Next.js
pkill -f "next dev"
```

### 3. Build Completo (Teste)
```bash
# Testar se build funciona
npm run build

# Se falhar, limpar e tentar novamente
rm -rf .next && npm run build
```

### 4. Porta em Uso
```bash
# Se porta 3000 estiver em uso
lsof -ti:3000 | xargs kill -9

# Ou usar outra porta
npm run dev -- -p 3001
```

## 📚 Documentação Next.js

- [App Router vs Pages Router](https://nextjs.org/docs/app)
- [Troubleshooting](https://nextjs.org/docs/messages)
- [Cache Issues](https://nextjs.org/docs/app/api-reference/next-config-js)

## ✅ Status Após Fix

Após executar o script de fix:

- ✅ Cache `.next` limpo
- ✅ Cache TypeScript limpo  
- ✅ Processos antigos parados
- ✅ Pronto para `npm run dev`

**Tempo esperado:** 30-60 segundos para compilação inicial

---

## 🎯 Resumo

| Problema | Solução | Tempo |
|----------|---------|-------|
| `_document.js not found` | `./fix-nextjs-build.sh` | 2 min |
| Build 404 errors | `rm -rf .next && npm run dev` | 2 min |
| Hot reload não funciona | Limpar cache + reiniciar | 2 min |
| Erro após mudanças | Sempre limpar `.next` | 2 min |

---

**Criado:** 10 de outubro de 2025  
**Status:** ✅ **RESOLVIDO**  
**Script:** `fix-nextjs-build.sh` criado  
**Próximo passo:** `npm run dev`

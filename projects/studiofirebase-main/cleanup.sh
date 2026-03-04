#!/bin/bash
set -e

WORKSPACE_DIR="/Users/italosanta/Downloads/studiofirebase-main 3"
cd "$WORKSPACE_DIR"

echo "🧹 Iniciando limpeza completa do workspace..."
echo ""

# 1. Remover caches do sistema
echo "1️⃣  Removendo caches de sistema..."
find . -name ".DS_Store" -type f -delete 2>/dev/null || true
find . -name "*.swp" -type f -delete 2>/dev/null || true
find . -name "*.swo" -type f -delete 2>/dev/null || true
find . -name "*~" -type f -delete 2>/dev/null || true
echo "   ✓ Arquivos de sistema removidos"

# 2. Remover caches do Node/NPM
echo "2️⃣  Removendo caches NPM e Node..."
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf .npm 2>/dev/null || true
echo "   ✓ Caches NPM removidos"

# 3. Remover caches do Next.js
echo "3️⃣  Removendo caches Next.js..."
rm -rf .next 2>/dev/null || true
rm -rf out 2>/dev/null || true
echo "   ✓ Caches Next.js removidos"

# 4. Remover caches de build
echo "4️⃣  Removendo caches de build..."
rm -rf dist 2>/dev/null || true
rm -rf build 2>/dev/null || true
rm -rf .tsc 2>/dev/null || true
rm -f *.tsbuildinfo 2>/dev/null || true
rm -f **/*.tsbuildinfo 2>/dev/null || true
echo "   ✓ Caches de build removidos"

# 5. Remover caches de ESLint
echo "5️⃣  Removendo caches ESLint..."
rm -f .eslintcache 2>/dev/null || true
echo "   ✓ Cache ESLint removido"

# 6. Remover diretórios de cache
echo "6️⃣  Removendo diretórios de cache..."
rm -rf .turbo 2>/dev/null || true
rm -rf .cache 2>/dev/null || true
echo "   ✓ Diretórios de cache removidos"

# 7. Remover arquivos de teste desnecessários
echo "7️⃣  Analisando arquivos de teste..."
# Apenas mostrar quais testes existem, não remover automaticamente
find . -name "*.test.js" -o -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.js" | grep -v node_modules | head -10
echo "   ℹ️  Arquivos de teste identificados (não removidos automaticamente)"

# 8. Limpar arquivo histórico de yarn/npm
echo "8️⃣  Removendo históricos..."
rm -f .yarnclean 2>/dev/null || true
echo "   ✓ Históricos removidos"

# 9. Mostrar resultado da limpeza
echo ""
echo "✅ Limpeza concluída!"
echo ""
echo "📊 Espaço em disco após limpeza:"
du -sh . 2>/dev/null
du -sh node_modules 2>/dev/null || echo "   node_modules não existe ou está vazio"

echo ""
echo "📝 Resumo:"
echo "   - Caches de sistema: ✓"
echo "   - NPM cache: ✓"
echo "   - Next.js (.next): ✓"
echo "   - TypeScript build info: ✓"
echo "   - ESLint cache: ✓"
echo "   - Turbo cache: ✓"

#!/bin/bash
# Script para limpar caches e arquivos temporários do projeto

echo "🧹 Limpando caches do projeto..."

# Limpar cache do Next.js
echo "📦 Removendo builds do Next.js..."
rm -rf .next out build dist .turbo

# Limpar cache do npm
echo "📦 Limpando cache do npm..."
npm cache clean --force 2>/dev/null

# Limpar node_modules de subprojetos
echo "📦 Removendo node_modules duplicados..."
rm -rf functions/node_modules 2>/dev/null
rm -rf italosantos-com/node_modules 2>/dev/null
rm -rf ios-web-payments/node_modules 2>/dev/null

# Limpar cache do Firebase
echo "🔥 Limpando cache do Firebase..."
rm -rf .firebase 2>/dev/null
rm -rf ~/Library/Caches/firebase 2>/dev/null

# Limpar logs do Firebase
echo "📝 Removendo logs do Firebase..."
rm -rf firebase-debug.log* 2>/dev/null
rm -rf src/firebase-debug.log* 2>/dev/null

# Verificar espaço disponível
echo ""
echo "✅ Limpeza concluída!"
echo "💾 Espaço disponível:"
df -h / | tail -1 | awk '{print "   " $4 " livre (" $5 " usado)"}'

echo ""
echo "📊 Tamanho do node_modules principal:"
du -sh node_modules 2>/dev/null || echo "   node_modules não encontrado"

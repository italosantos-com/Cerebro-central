#!/bin/bash

echo "🚀 Deploy Script - Studio Italo Santos"
echo "======================================"

# Verificar se está na branch correta
CURRENT_BRANCH=$(git branch --show-current)
echo "📋 Branch atual: $CURRENT_BRANCH"

# Build do projeto
echo "🔨 Fazendo build do projeto..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build concluído com sucesso!"
else
    echo "❌ Erro no build. Verifique os logs acima."
    exit 1
fi

# Verificar se há mudanças para commit
if [[ -n $(git status --porcelain) ]]; then
    echo "📝 Fazendo commit das mudanças..."
    git add .
    git commit -m "Deploy: $(date +'%Y-%m-%d %H:%M:%S')"
else
    echo "ℹ️  Nenhuma mudança para commit."
fi

# Push para o repositório
echo "⬆️  Fazendo push para o repositório..."
git push origin $CURRENT_BRANCH

if [ $? -eq 0 ]; then
    echo "✅ Push concluído!"
    echo "🎉 Deploy iniciado automaticamente!"
    echo ""
    echo "📱 Acesse:"
    echo "   • Vercel Dashboard: https://vercel.com/dashboard"
    echo "   • Seu site: https://studio-italosantos.vercel.app"
    echo ""
else
    echo "❌ Erro no push. Verifique sua conexão e permissões."
    exit 1
fi

echo "🏁 Script de deploy finalizado!"

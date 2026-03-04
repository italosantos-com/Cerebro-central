#!/bin/bash

# Script para instalar e inicializar o Genkit com Google Generative AI (Gemini)

echo "🚀 Iniciando instalação do Gemini CLI..."

# Verificar se npm está disponível
if ! command -v npm &> /dev/null; then
    echo "❌ npm não encontrado. Por favor, instale Node.js"
    exit 1
fi

# Instalar a CLI do Genkit globalmente
echo "📦 Instalando Genkit CLI..."
npm install -g @genkit-ai/cli

# Verificar se foi instalado com sucesso
if command -v genkit &> /dev/null; then
    echo "✅ Genkit CLI instalado com sucesso!"
    genkit --version
else
    echo "❌ Falha ao instalar Genkit CLI"
    exit 1
fi

# Instalar as dependências do projeto
echo "📦 Instalando dependências do projeto..."
npm install

# Verificar se há variável de ambiente GOOGLE_GENAI_API_KEY
if [ -z "$GOOGLE_GENAI_API_KEY" ]; then
    echo "⚠️  AVISO: GOOGLE_GENAI_API_KEY não está configurada"
    echo "Para usar o Genkit com Gemini, execute:"
    echo "export GOOGLE_GENAI_API_KEY='sua-chave-api-aqui'"
fi

echo ""
echo "✅ Instalação concluída!"
echo ""
echo "Próximos passos:"
echo "1. Configure sua API Key (obtenha em https://ai.google.dev):"
echo "   export GOOGLE_GENAI_API_KEY='sua-chave-api-aqui'"
echo ""
echo "2. Execute o Genkit em modo desenvolvimento:"
echo "   genkit start"
echo ""
echo "3. Acesse o Genkit Developer Interface em: http://localhost:4000"

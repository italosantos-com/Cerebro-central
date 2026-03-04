#!/bin/bash

echo "🔍 Diagnóstico do Build Next.js"
echo "================================"
echo ""

echo "1️⃣ Verificando versão do Node..."
node --version

echo ""
echo "2️⃣ Verificando versão do npm..."
npm --version

echo ""
echo "3️⃣ Verificando memória disponível..."
vm_stat | grep "Pages free"

echo ""
echo "4️⃣ Iniciando build com timeout de 120 segundos..."
echo "   (Se travar, será cancelado automaticamente)"
echo ""

# Start build in background
npm run build &
BUILD_PID=$!

# Monitor for 120 seconds
for i in {1..120}; do
  if ! ps -p $BUILD_PID > /dev/null 2>&1; then
    echo ""
    echo "✅ Build completou em $i segundos!"
    exit 0
  fi
  
  # Show progress every 10 seconds
  if [ $((i % 10)) -eq 0 ]; then
    echo "⏱️  $i segundos..."
  fi
  
  sleep 1
done

echo ""
echo "⚠️  Build travou após 120 segundos. Matando processo..."
kill -9 $BUILD_PID 2>/dev/null

echo ""
echo "📊 Verificando uso de memória pelo node..."
ps aux | grep node | grep -v grep

echo ""
echo "💡 Recomendação: O build está travando. Possíveis causas:"
echo "   - Importação circular"
echo "   - Dependência problemática (genkit, opentelemetry, MCP SDK)"
echo "   - Falta de memória"
echo ""

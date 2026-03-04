#!/bin/bash
# Build script simplificado
echo "🚀 Iniciando build..."
rm -rf .next
export DISABLE_GENKIT=true
export NEXT_TELEMETRY_DISABLED=1
npx next build

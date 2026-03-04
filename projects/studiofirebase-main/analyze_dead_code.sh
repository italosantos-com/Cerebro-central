#!/bin/bash

echo "🔍 ANALISANDO CÓDIGO MORTO..."
echo ""

# 1. Componentes de teste/debug óbvios
echo "1️⃣  Componentes de TESTE/DEBUG:"
find src/components -maxdepth 1 -type f \( -name "*test*" -o -name "*debug*" -o -name "*demo*" -o -name "*example*" \) 2>/dev/null

# 2. Serviços alternativos/backup
echo ""
echo "2️⃣  Serviços ALTERNATIVOS/BACKUP:"
ls -1 src/services/ 2>/dev/null | grep -E "alternative|backup|old|v[0-9]|demo|test" || echo "Nenhum encontrado"

# 3. Scripts DEPLOY duplicados
echo ""
echo "3️⃣  Scripts DEPLOY DUPLICADOS:"
ls -1 scripts/deploy-*.sh 2>/dev/null | head -15

# 4. Utils potencialmente mortos
echo ""
echo "4️⃣  UTILS com baixa referência (potencialmente mortos):"
for f in src/utils/*.ts; do
  if [ -f "$f" ]; then
    name=$(basename "$f" .ts)
    count=$(grep -r "$name" src/ functions/ 2>/dev/null | grep -v "^$f" | wc -l)
    if [ $count -lt 3 ]; then
      echo "  ⚠️  $(basename $f) - referências: $count"
    fi
  fi
done | head -15

echo ""
echo "✅ Análise concluída"

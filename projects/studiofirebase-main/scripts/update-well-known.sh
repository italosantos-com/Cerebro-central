#!/bin/zsh
# Script para atualizar arquivos .well-known do deploy para a pasta pública

set -e

SRC="./deploy/apple-pay/.well-known/apple-developer-merchantid-domain-association"
DEST="./public/.well-known/apple-developer-merchantid-domain-association"

if [ -f "$SRC" ]; then
  cp "$SRC" "$DEST"
  echo "Arquivo atualizado: $DEST"
else
  echo "Arquivo de origem não encontrado: $SRC"
  exit 1
fi

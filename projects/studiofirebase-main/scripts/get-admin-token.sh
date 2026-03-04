#!/bin/bash

# Script para obter o token de admin (ID token do Firebase) do navegador
# Útil para testar rotas protegidas (ex: /api/admin/central-assistant)

echo "🔑 Obtendo Token de Admin (Firebase ID token)"
echo ""
echo "📋 Siga estas etapas:"
echo ""
echo "1. Abra o site no navegador"
echo "2. Faça login como administrador"
echo "3. Abra o DevTools (F12)"
echo ""
echo "✅ MÉTODO RECOMENDADO (mais confiável): Network → copiar Authorization"
echo "4. Vá para a aba 'Network'"
echo "5. Navegue para uma página do admin (ex: /admin/settings) ou clique em algo que chame /api/admin/*"
echo "6. Clique em uma request para /api/admin/*"
echo "7. Em Request Headers, copie o header:"
echo ""
echo "   Authorization: Bearer <TOKEN>"
echo ""
echo "   Cole aqui APENAS o <TOKEN> (ou cole a linha inteira; o script limpa o Bearer)."
echo ""
echo "══════════════════════════════════════════════════════════"
echo ""
echo "🧪 MÉTODO ALTERNATIVO (Console): pegar token via Firebase Auth"
echo "4. Vá para a aba 'Console'"
echo "5. Cole e execute:"
echo ""
echo "   (async () => {"
echo "     try {"
echo "       const mod = await import('firebase/auth');"
echo "       const auth = mod.getAuth();"
echo "       const token = await auth.currentUser?.getIdToken(true);"
echo "       console.log(token);"
echo "     } catch (e) {"
echo "       console.error('Falha ao importar firebase/auth no console. Use o método Network.', e);"
echo "     }"
echo "   })();"
echo ""
echo "6. Copie o token impresso e cole abaixo"
echo ""
echo "══════════════════════════════════════════════════════════"
echo ""

# Ler token do usuário
read -p "Cole o token aqui: " TOKEN

if [ -z "$TOKEN" ]; then
    echo ""
    echo "❌ Token vazio! Tente novamente."
    exit 1
fi

# Normalizar: remover prefixo Bearer e aspas
TOKEN=$(echo "$TOKEN" | sed -E 's/^Bearer[[:space:]]+//i' | tr -d '"' | tr -d "'")

# Validação leve: JWT normalmente tem 2 pontos
DOTS=$(echo "$TOKEN" | awk -F'.' '{print NF-1}')
if [ "$DOTS" -ne 2 ]; then
    echo ""
    echo "⚠️  Aviso: o token colado não parece um JWT (esperado 2 pontos)."
    echo "    Se o teste falhar com 401, recopie o ID token do console." 
fi

echo ""
echo "✅ Token capturado!"
echo ""
echo "📝 Adicione estas linhas ao seu arquivo .env.local (recomendado) ou .env:"
echo ""
echo "ADMIN_ID_TOKEN=$TOKEN"
echo "ADMIN_REFRESH_TOKEN=$TOKEN  # compat"
echo ""
echo "══════════════════════════════════════════════════════════"
echo ""

# Perguntar se deseja adicionar automaticamente
read -p "Deseja adicionar automaticamente ao .env.local/.env? (s/n): " ADD_TO_ENV

if [ "$ADD_TO_ENV" = "s" ] || [ "$ADD_TO_ENV" = "S" ]; then
    # Preferir .env.local quando disponível (Next.js)
    ENV_FILE=".env.local"
    if [ ! -f "$ENV_FILE" ]; then
        # fallback para .env
        ENV_FILE=".env"
    fi

    # Criar arquivo se nenhum existir
    if [ ! -f "$ENV_FILE" ]; then
        echo "" > "$ENV_FILE"
        echo "✅ Criado $ENV_FILE"
    fi

    # Helper para upsert em arquivo
    upsert_line() {
        local key="$1"
        local value="$2"
        local file="$3"

        if grep -q "^${key}=" "$file"; then
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s|^${key}=.*|${key}=${value}|" "$file"
            else
                sed -i "s|^${key}=.*|${key}=${value}|" "$file"
            fi
        else
            echo "${key}=${value}" >> "$file"
        fi
    }

    echo ""
    echo "📝 Gravando em $ENV_FILE"

    # Comentário (uma vez)
    if ! grep -q "^# Token de Admin (Firebase ID token)" "$ENV_FILE"; then
        echo "" >> "$ENV_FILE"
        echo "# Token de Admin (Firebase ID token)" >> "$ENV_FILE"
    fi

    upsert_line "ADMIN_ID_TOKEN" "$TOKEN" "$ENV_FILE"
    upsert_line "ADMIN_REFRESH_TOKEN" "$TOKEN" "$ENV_FILE"

    echo "✅ Token gravado em $ENV_FILE"
fi

echo ""
echo "🎯 Próximos passos:"
echo ""
echo "1. Testar o endpoint protegido (Cérebro Central):"
echo "   node scripts/test-central-assistant.js --endpoint --email italo16rj@gmail.com --days 7"
echo ""
echo "2. (Opcional) Testar refresh do Twitter cache:"
echo "   npm run refresh-twitter-cache"
echo ""
echo "3. Observação: ID token expira; gere um novo se der 401"
echo ""
echo "══════════════════════════════════════════════════════════"
echo ""
echo "✅ Configuração completa!"
echo ""

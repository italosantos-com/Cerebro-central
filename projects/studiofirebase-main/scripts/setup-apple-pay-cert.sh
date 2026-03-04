#!/bin/bash

# Script para configurar certificado Apple Pay após download
# Execute este script após baixar o .p12 do Apple Developer Portal

echo "🍎 Configurador de Certificado Apple Pay"
echo "========================================"
echo ""

# Verificar se o arquivo .p12 foi fornecido
if [ -z "$1" ]; then
    echo "❌ Erro: Forneça o caminho do arquivo .p12"
    echo ""
    echo "Uso: ./setup-apple-pay-cert.sh /caminho/para/merchant_id.p12"
    echo ""
    echo "📥 Primeiro, baixe o certificado:"
    echo "   1. Acesse: https://developer.apple.com/account/resources/identifiers/list"
    echo "   2. Vá em 'Identifiers' > 'Merchant IDs'"
    echo "   3. Selecione: merchant.italosantos.com"
    echo "   4. Na seção 'Apple Pay Payment Processing Certificate'"
    echo "   5. Clique em 'Download' para baixar o .p12"
    echo ""
    exit 1
fi

P12_FILE="$1"

# Verificar se o arquivo existe
if [ ! -f "$P12_FILE" ]; then
    echo "❌ Erro: Arquivo não encontrado: $P12_FILE"
    exit 1
fi

echo "📂 Arquivo encontrado: $P12_FILE"
echo ""

# Criar diretório certs se não existir
mkdir -p certs

echo "🔑 Extraindo certificado..."
openssl pkcs12 -in "$P12_FILE" -clcerts -nokeys -out certs/apple-pay-cert-new.pem -passin pass: 2>/dev/null || {
    echo "Digite a senha do certificado:"
    openssl pkcs12 -in "$P12_FILE" -clcerts -nokeys -out certs/apple-pay-cert-new.pem
}

echo "🔐 Extraindo chave privada..."
openssl pkcs12 -in "$P12_FILE" -nocerts -out certs/apple-pay-key.pem -nodes -passin pass: 2>/dev/null || {
    echo "Digite a senha do certificado novamente:"
    openssl pkcs12 -in "$P12_FILE" -nocerts -out certs/apple-pay-key.pem -nodes
}

# Verificar se os arquivos foram criados
if [ ! -f "certs/apple-pay-key.pem" ]; then
    echo "❌ Erro ao extrair chave privada"
    exit 1
fi

echo ""
echo "✅ Certificados extraídos com sucesso!"
echo ""
echo "📁 Arquivos criados:"
echo "   - certs/apple-pay-cert-new.pem (certificado público)"
echo "   - certs/apple-pay-key.pem (chave privada)"
echo ""

# Validar a chave privada
echo "🔍 Validando chave privada..."
if openssl rsa -in certs/apple-pay-key.pem -check -noout 2>/dev/null; then
    echo "✅ Chave privada válida!"
else
    echo "❌ Erro: Chave privada inválida"
    exit 1
fi

# Validar o certificado
echo "🔍 Validando certificado..."
if openssl x509 -in certs/apple-pay-cert-new.pem -text -noout > /dev/null 2>&1; then
    echo "✅ Certificado válido!"
    
    # Mostrar informações do certificado
    echo ""
    echo "📋 Informações do Certificado:"
    openssl x509 -in certs/apple-pay-cert-new.pem -subject -dates -noout | sed 's/^/   /'
else
    echo "❌ Erro: Certificado inválido"
    exit 1
fi

echo ""
echo "🎉 Configuração concluída com sucesso!"
echo ""
echo "🚀 Próximos passos:"
echo "   1. Teste a validação: npm run test:applepay"
echo "   2. Configure seu domínio no Apple Developer Portal"
echo "   3. Deploy em HTTPS (Apple Pay requer HTTPS)"
echo ""
echo "⚠️  IMPORTANTE: Mantenha a chave privada segura!"
echo "   Adicione ao .gitignore se ainda não estiver"
echo ""

# Adicionar ao .gitignore se necessário
if ! grep -q "certs/apple-pay-key.pem" .gitignore 2>/dev/null; then
    echo "certs/apple-pay-key.pem" >> .gitignore
    echo "✅ Adicionado apple-pay-key.pem ao .gitignore"
fi

exit 0

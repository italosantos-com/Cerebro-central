# 🍎 Guia: Baixar Certificado Apple Pay (.p12)

## 📥 Passo a Passo para Baixar

### 1️⃣ Acessar Apple Developer Portal

Abra seu navegador e acesse:
```
https://developer.apple.com/account/resources/identifiers/list
```

**Login:** Use sua conta Apple Developer

---

### 2️⃣ Navegar até Merchant IDs

1. No menu lateral esquerdo, clique em **"Identifiers"**
2. No filtro dropdown (superior direito), selecione **"Merchant IDs"**
3. Você verá uma lista dos seus Merchant IDs

---

### 3️⃣ Selecionar seu Merchant ID

Procure e clique em:
```
merchant.italosantos.com
```

*(Este é o Merchant ID detectado no seu certificado atual)*

---

### 4️⃣ Localizar o Certificado

Na página do Merchant ID, você verá:

- **Apple Pay Payment Processing Certificate**
  - Status: Active / Expired / Not Created
  - Botão: **"Create Certificate"** ou **"Download"**

---

### 5️⃣ Baixar o Certificado

#### Se o certificado já existe:
1. Clique no botão **"Download"**
2. O arquivo `.cer` será baixado
3. **⚠️ IMPORTANTE:** Você também precisa do arquivo `.p12`

#### Para obter o .p12:
1. Se você criou o certificado neste Mac:
   - Abra **Keychain Access** (Acesso às Chaves)
   - Vá em **"login"** > **"Certificates"**
   - Procure por: `Apple Pay Payment Processing: merchant.italosantos.com`
   - Clique com botão direito > **"Export"**
   - Escolha formato: **"Personal Information Exchange (.p12)"**
   - Salve como: `merchant_id.p12`
   - Defina uma senha (ou deixe em branco)

2. Se você **NÃO** criou neste Mac:
   - Você precisará ter o arquivo `.p12` do Mac original
   - OU criar um novo certificado (veja próxima seção)

---

### 6️⃣ Criar Novo Certificado (se necessário)

Se você não tem o `.p12` ou o certificado expirou:

1. Na página do Merchant ID, clique em **"Create Certificate"**
2. Siga as instruções para criar um **Certificate Signing Request (CSR)**:
   
   **No Mac:**
   - Abra **Keychain Access**
   - Menu: **Keychain Access** > **Certificate Assistant** > **Request a Certificate from a Certificate Authority**
   - Preencha:
     - User Email Address: `seu-email@example.com`
     - Common Name: `merchant.italosantos.com`
     - Selecione: **"Saved to disk"**
   - Clique **Continue** e salve o arquivo `.certSigningRequest`

3. Faça upload do arquivo `.certSigningRequest` no Apple Developer Portal
4. Baixe o certificado `.cer` gerado
5. Dê duplo clique no `.cer` para instalá-lo no Keychain
6. No Keychain, exporte como `.p12` (veja passo 5.1 acima)

---

## 🚀 Após Baixar o .p12

### Opção 1: Usar o Script Automático

```bash
# Certifique-se que o arquivo .p12 está no seu computador
# Depois execute:
./setup-apple-pay-cert.sh ~/Downloads/merchant_id.p12
```

O script irá:
- ✅ Extrair o certificado
- ✅ Extrair a chave privada
- ✅ Validar ambos os arquivos
- ✅ Configurar permissões corretas
- ✅ Adicionar ao .gitignore

---

### Opção 2: Configuração Manual

```bash
# 1. Copie o arquivo .p12 para o projeto
cp ~/Downloads/merchant_id.p12 .

# 2. Extraia o certificado
openssl pkcs12 -in merchant_id.p12 -clcerts -nokeys -out certs/apple-pay-cert.pem

# 3. Extraia a chave privada
openssl pkcs12 -in merchant_id.p12 -nocerts -out certs/apple-pay-key.pem -nodes

# 4. Valide os arquivos
openssl x509 -in certs/apple-pay-cert.pem -text -noout
openssl rsa -in certs/apple-pay-key.pem -check -noout

# 5. Remova o .p12 (segurança)
rm merchant_id.p12
```

---

## 🔐 Segurança

### ⚠️ IMPORTANTE:

1. **NUNCA** faça commit da chave privada no Git
2. Adicione ao `.gitignore`:
   ```
   certs/apple-pay-key.pem
   *.p12
   ```

3. Em produção, use variáveis de ambiente ou secrets:
   ```bash
   # Exemplo para deploy
   export APPLE_PAY_CERT="$(cat certs/apple-pay-cert.pem)"
   export APPLE_PAY_KEY="$(cat certs/apple-pay-key.pem)"
   ```

---

## ✅ Verificar Configuração

Após configurar, teste:

```bash
# Verificar se os arquivos existem
ls -la certs/

# Deve mostrar:
# apple-pay-cert.pem (certificado público) ✅
# apple-pay-key.pem (chave privada) ✅

# Validar certificado
openssl x509 -in certs/apple-pay-cert.pem -text -noout | grep "Subject:"

# Validar chave
openssl rsa -in certs/apple-pay-key.pem -check -noout
```

---

## 🆘 Troubleshooting

### "Não consigo encontrar o certificado no Keychain"
- Verifique se você está logado com a conta Apple Developer correta
- O certificado pode estar em "System" ou "login"
- Use a busca: digite "merchant.italosantos.com"

### "Erro ao exportar .p12"
- Certifique-se de que o certificado tem a chave privada associada
- Deve aparecer uma seta ▶ ao lado do certificado no Keychain
- Se não tiver a seta, você não tem a chave privada neste Mac

### "Certificado expirado"
- Crie um novo certificado seguindo o passo 6
- Os certificados Apple Pay são válidos por ~2 anos

### "Senha do .p12 não funciona"
- Tente sem senha (deixe em branco)
- Ou use a senha que você definiu ao exportar

---

## 📞 Links Úteis

- [Apple Pay Developer Portal](https://developer.apple.com/apple-pay/)
- [Apple Pay Web Guide](https://developer.apple.com/documentation/apple_pay_on_the_web)
- [Certificate Management](https://developer.apple.com/support/certificates/)

---

## 🎯 Resumo Rápido

```bash
# 1. Baixar .p12 do Apple Developer Portal
# 2. Executar:
./setup-apple-pay-cert.sh ~/Downloads/merchant_id.p12

# 3. Verificar:
ls -la certs/

# 4. Testar API:
npm run dev

# 5. Acessar em HTTPS para testar Apple Pay
```

**Tempo estimado:** 10-15 minutos

---

**Precisa de ajuda?** Verifique o `CERTIFICATES_REPORT.md` para mais detalhes.

# 🚀 Guia de Deploy - Google Cloud Platform

## 📋 Pré-requisitos

### 1. Instalar Google Cloud SDK

**macOS:**
```bash
brew install --cask google-cloud-sdk
```

**Linux:**
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

**Windows:**
Baixe em: https://cloud.google.com/sdk/docs/install

### 2. Configurar projeto no GCP

1. Acesse: https://console.cloud.google.com
2. Projeto: **YOUR_FIREBASE_PROJECT_ID**
3. Habilite as APIs necessárias:
   - Cloud Build API
   - App Engine Admin API
   - Secret Manager API
   - Cloud SQL Admin API (se usar banco de dados)

---

## 🔐 Configurar Secrets

Antes do primeiro deploy, configure as variáveis de ambiente no Secret Manager:

```bash
# Tornar o script executável
chmod +x deploy-gcloud.sh

# Executar configuração de secrets
./deploy-gcloud.sh
# Escolha a opção 4 (Configurar Secrets)
```

Ou manualmente:

```bash
# Exemplo: criar secret para Firebase API Key
echo -n "AIzaSyDHha5VHJPMPQJWoW9S15jjb-7YvgmdbA4" | \
  gcloud secrets create FIREBASE_API_KEY \
  --data-file=- \
  --replication-policy="automatic"
```

---

## 🚀 Deploy

### Método 1: Deploy Completo (Recomendado)

```bash
chmod +x deploy-gcloud.sh
./deploy-gcloud.sh
```

Escolha a opção **1** para deploy com Cloud Build.

### Método 2: Deploy Manual

```bash
# 1. Build local (opcional)
npm run build

# 2. Submit para Cloud Build
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID,_REGION=southamerica-east1

# 3. Deploy para App Engine
gcloud app deploy app.yaml --quiet
```

### Método 3: Deploy Direto (sem Cloud Build)

```bash
# Build e deploy direto
npm run build
gcloud app deploy app.yaml --quiet
```

---

## 📊 Monitoramento

### Ver logs em tempo real:
```bash
gcloud app logs tail -s default
```

### Ver builds:
```bash
gcloud builds list --limit=10
```

### Abrir aplicação:
```bash
gcloud app browse
```

### Ver secrets configurados:
```bash
gcloud secrets list
```

---

## 🔧 Comandos Úteis

### Configurar projeto:
```bash
gcloud config set project YOUR_FIREBASE_PROJECT_ID
```

### Fazer login:
```bash
gcloud auth login
```

### Ver informações do App Engine:
```bash
gcloud app describe
```

### Ver versões deployadas:
```bash
gcloud app versions list
```

### Deletar versão antiga:
```bash
gcloud app versions delete VERSION_ID
```

### Ver uso de recursos:
```bash
gcloud app instances list
```

---

## 🌍 URLs

- **Console GCP:** https://console.cloud.google.com/appengine?project=YOUR_FIREBASE_PROJECT_ID
- **Cloud Build:** https://console.cloud.google.com/cloud-build/builds?project=YOUR_FIREBASE_PROJECT_ID
- **Secret Manager:** https://console.cloud.google.com/security/secret-manager?project=YOUR_FIREBASE_PROJECT_ID
- **App Engine:** https://YOUR_FIREBASE_PROJECT_ID.appspot.com (ou domínio customizado)

---

## 🐛 Troubleshooting

### Erro: "API not enabled"
```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable appengine.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

### Erro: "Insufficient permissions"
```bash
# Verificar conta ativa
gcloud auth list

# Fazer login novamente
gcloud auth login

# Verificar permissões
gcloud projects get-iam-policy YOUR_FIREBASE_PROJECT_ID
```

### Erro: "Build timeout"
Aumente o timeout no `cloudbuild.yaml`:
```yaml
timeout: '3600s'  # 1 hora
```

### Erro: "Out of memory"
Aumente a máquina no `cloudbuild.yaml`:
```yaml
options:
  machineType: 'E2_HIGHCPU_32'
```

---

## 💰 Custos

### Estimativa mensal (App Engine F2):
- **Instâncias ativas:** ~$50-100/mês
- **Cloud Build:** Primeiros 120 min/dia grátis
- **Secret Manager:** Primeiros 6 secrets grátis
- **Armazenamento:** ~$0.26/GB/mês

### Otimização de custos:
1. Use `min_instances: 0` para scaling automático
2. Configure `target_cpu_utilization` adequadamente
3. Use cache para conteúdo estático
4. Monitore uso no painel de faturamento

---

## 📝 Checklist de Deploy

- [ ] gcloud CLI instalado e configurado
- [ ] Projeto GCP criado (YOUR_FIREBASE_PROJECT_ID)
- [ ] APIs habilitadas
- [ ] Secrets configurados no Secret Manager
- [ ] `.env.local` configurado localmente
- [ ] Build local testado (`npm run build`)
- [ ] `app.yaml` configurado corretamente
- [ ] `cloudbuild.yaml` revisado
- [ ] Health check endpoint criado (`/api/health`)
- [ ] `.gcloudignore` configurado

---

## 🎯 Próximos Passos

1. Configure domínio customizado (italosantos.com)
2. Configure CDN e cache
3. Configure monitoramento e alertas
4. Configure backup automático
5. Configure CI/CD com GitHub Actions

---

## 📞 Suporte

- **Documentação GCP:** https://cloud.google.com/docs
- **App Engine:** https://cloud.google.com/appengine/docs
- **Cloud Build:** https://cloud.google.com/build/docs
- **Fórum:** https://stackoverflow.com/questions/tagged/google-app-engine

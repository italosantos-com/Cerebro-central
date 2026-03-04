# 🚀 Deploy Rápido - Google Cloud

## Início Rápido

```bash
# 1. Instalar gcloud CLI (se não tiver)
brew install --cask google-cloud-sdk  # macOS
# ou visite: https://cloud.google.com/sdk/docs/install

# 2. Fazer login
gcloud auth login

# 3. Configurar projeto
gcloud config set project YOUR_FIREBASE_PROJECT_ID

# 4. Executar deploy
./deploy-gcloud.sh
```

## Estrutura de Arquivos

```
📁 Projeto
├── 📄 deploy-gcloud.sh          ← Script principal de deploy
├── 📄 cloudbuild.yaml           ← Configuração do Cloud Build
├── 📄 app.yaml                  ← Configuração do App Engine
├── 📄 .gcloudignore             ← Arquivos a ignorar no upload
└── 📁 docs/
    └── 📄 DEPLOY_GCLOUD.md      ← Documentação completa
```

## Opções de Deploy

O script oferece 5 opções:

1. **Deploy com Cloud Build** (Recomendado)
   - Build na nuvem
   - Deploy automático
   - Logs completos

2. **Deploy direto App Engine**
   - Build local
   - Upload direto
   - Mais rápido para pequenas mudanças

3. **Apenas Cloud Build**
   - Somente build na nuvem
   - Não faz deploy

4. **Configurar Secrets**
   - Importa variáveis do .env.local
   - Cria secrets no Secret Manager
   - **Execute isso primeiro!**

5. **Cancelar**

## URLs Importantes

- **Console GCP:** https://console.cloud.google.com/appengine?project=YOUR_FIREBASE_PROJECT_ID
- **Cloud Build:** https://console.cloud.google.com/cloud-build/builds?project=YOUR_FIREBASE_PROJECT_ID
- **Logs:** `gcloud app logs tail -s default`

## Documentação Completa

Veja: [`docs/DEPLOY_GCLOUD.md`](docs/DEPLOY_GCLOUD.md)

---

**Projeto:** YOUR_FIREBASE_PROJECT_ID  
**Região:** southamerica-east1  
**Runtime:** Node.js 20

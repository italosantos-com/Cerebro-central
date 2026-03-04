# italosantos.com - Documentação Completa

## 📚 Índice

1. [Visão Geral](#visão-geral)
2. [🆕 Sistema Multi-Admin com ProfileSettings Isolado](#-sistema-multi-admin-com-profilesettings-isolado)
3. [Sistema de Registro de Administradores](#sistema-de-registro-de-administradores)
4. [Facebook OpenAPI - WhatsApp Business](#facebook-openapi---whatsapp-business)
5. [Solução de Problemas da Câmera](#solução-de-problemas-da-câmera)
6. [Guia Rápido de Início](#guia-rápido-de-início)
7. [Configuração e Deploy](#configuração-e-deploy)

---

## Visão Geral

Plataforma completa com:
- Sistema de autenticação facial (Face ID)
- Painel administrativo
- Integrações sociais (Twitter, Instagram, Facebook)
- Sistema de assinaturas
- Pagamentos (PayPal, Stripe, Mercado Pago)
- WhatsApp Business API (via OpenAPI)

---

## 🆕 Sistema Multi-Admin com ProfileSettings Isolado

### 📋 Descrição

Cada administrador do sistema possui seu próprio **ProfileSettings completamente isolado**, permitindo que múltiplos criadores/vendedores (ex: pedro, lucas, italo) tenham suas próprias configurações sem compartilhar dados.

### 🌟 SuperAdmin - Italo Santos (Perfil Global Principal)

**O SuperAdmin controla a página inicial (`/`) sem precisar de UID**:

```
italosantos.com/                 ← ⭐ Perfil Global (SuperAdmin)
├── admin/profileSettings         ← Dados globais (SEM UID)
├── Usuário: Italo Santos
├── Username: severepics
├── Email: pix@italosantos.com
└── isMainAdmin: true

italosantos.com/pedro            ← Admin individual
├── admins/{uid_pedro}/profile/settings ← Dados isolados de Pedro
│
italosantos.com/lucas            ← Admin individual
├── admins/{uid_lucas}/profile/settings ← Dados isolados de Lucas
│
italosantos.com/maria            ← Admin individual
└── admins/{uid_maria}/profile/settings ← Dados isolados de Maria
```

**Privilégios do SuperAdmin**:
- ✅ Controla a homepage (`/`)
- ✅ Acessa painel via `/admin` (sem slug)
- ✅ Dados em `admin/profileSettings` (global)
- ✅ Pode gerenciar outros admins
- ✅ Não precisa de UID para ser acessado

**Diferenças vs Regular Admin**:
| | SuperAdmin | Regular Admin |
|---|------------|---------------|
| URL | `/` e `/admin` | `/{username}` |
| Dados | `admin/profileSettings` | `admins/{uid}/profile/settings` |
| Gerenciar outros | ✅ Sim | ❌ Não |

### 📚 Documentação

Para entender completamente a arquitetura de isolamento:

1. **[SUPERADMIN_GLOBAL_PROFILE_SETUP.md](./docs/SUPERADMIN_GLOBAL_PROFILE_SETUP.md)** ⭐ **PERFIL GLOBAL**
   - Configuração do SuperAdmin (Italo Santos)
   - Como funciona o perfil global
   - Scripts de setup e verificação
   - Diferenças entre SuperAdmin e Regular Admin

2. **[PROFILE_SETTINGS_EXECUTIVE_SUMMARY.md](./docs/PROFILE_SETTINGS_EXECUTIVE_SUMMARY.md)** 📌 **COMECE AQUI**
   - Resumo executivo (5 min)
   - O que foi implementado
   - Fluxos principais
   - Exemplos de uso

3. **[PROFILE_SETTINGS_ISOLATION_ARCHITECTURE.md](./docs/PROFILE_SETTINGS_ISOLATION_ARCHITECTURE.md)** 🏗️ **ARQUITETURA DETALHADA**
   - Análise completa de isolamento
   - Matriz de funcionalidades
   - Exemplo de código para cada cenário
   - Validações de segurança
   - Retrocompatibilidade

4. **[PROFILE_SETTINGS_SECURITY_TESTS.md](./docs/PROFILE_SETTINGS_SECURITY_TESTS.md)** 🔒 **TESTES DE SEGURANÇA**
   - 8 testes de isolamento
   - Cenários de erro
   - Checklist de validação
   - Comandos úteis

### ✨ Funcionalidades

- ✅ Cada admin tem perfil isolado (`admins/{uid}/profile/settings`)
- ✅ Admin global preservado para compatibilidade (`admin/profileSettings`)
- ✅ URLs públicas individuais (`italosantos.com/username`)
- ✅ API protegida com autenticação JWT
- ✅ Firestore rules validam acesso por UID
- ✅ Cache isolado por admin (5 min TTL)
- ✅ Main admin pode gerenciar outros admins
- ✅ Dados sensíveis removidos para público

### 🚀 Uso Rápido

#### Admin Editar Seu Perfil
```typescript
const { user } = useAuth();
const settings = { name: 'Novo Nome', ... };

const response = await fetch('/api/admin/profile-settings', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${await user.getIdToken()}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    settings,
    adminUid: user.uid  // ← Sempre seu próprio uid
  })
});
```

#### Carregar Perfil Público
```typescript
// Hook detecta username na URL e carrega automaticamente
const { settings } = useProfileSettings();
// Exemplo: em /pedro, carrega de admins/{pedro_uid}/profile/settings
```

#### Main Admin Editar Outro Admin
```typescript
const targetAdminUid = 'abc123';
// POST com targetAdminUid
// API valida isMainAdmin == true
// Salva em: admins/{abc123}/profile/settings
```

### 🔐 Segurança

| Camada | Proteção |
|---|---|
| **Firestore Rules** | Apenas admin autenticado acessa seu `admins/{uid}/*` |
| **API Authentication** | Requer Bearer token JWT |
| **Ownership Validation** | Admin A não consegue salvar Admin B |
| **Main Admin Powers** | Apenas main admin pode gerenciar outros |
| **Secrets Removal** | Dados públicos não contêm PayPal/Mercado Pago secrets |

---

## Sistema de Registro de Administradores

### Arquitetura

#### Componentes Principais

1. **Frontend**
   - `src/components/admin/admin-registration-wizard.tsx` - Wizard de 4 etapas
   - `src/components/auth/face-id-register.tsx` - Captura facial
   
2. **Backend APIs**
   - `src/app/api/admin/auth/start-registration/route.ts` - Inicia processo
   - `src/app/api/admin/auth/complete-registration/route.ts` - Finaliza cadastro
   - `src/app/api/production/admin/auth/send-email-code/route.ts` - Envia código email
   - `src/app/api/production/admin/auth/send-sms-code/route.ts` - Envia código SMS

#### Fluxo de Registro

```
1. Usuário informa código de convite
   ↓
2. Sistema valida código e inicia registro pendente
   ↓
3. Captura facial + dados pessoais
```
   ↓
4. Verificação 2FA (Email + SMS)
   ↓
5. Admin criado no Firestore + Auditoria
```

#### Firestore Collections

**`pending_admin_registrations`**
```json
{
  "email": "admin@example.com",
  "name": "João Silva",
  "phone": "+5511999999999",
  "faceDescriptor": [0.123, 0.456, ...],
  "createdAt": "2025-01-01T10:00:00Z",
  "expiresAt": "2025-01-01T10:30:00Z"
}
```

**`verification_codes`**
```json
{
  "email": "admin@example.com",
  "code": "123456",
  "type": "email" | "sms",
  "expiresAt": "2025-01-01T10:10:00Z",
  "attempts": 0
}
```

**`admins`**
```json
{
  "email": "admin@example.com",
  "name": "João Silva",
  "phone": "+5511999999999",
  "faceDescriptor": [0.123, 0.456, ...],
  "createdAt": "2025-01-01T10:00:00Z",
  "isActive": true
}
```

**`admin_audit_log`**
```json
{
  "action": "admin_registered",
  "adminEmail": "admin@example.com",
  "timestamp": "2025-01-01T10:00:00Z",
  "metadata": {}
}
```

### Configuração

#### Variáveis de Ambiente (`.env.local`)

```bash
# Firebase Admin
FIREBASE_* and GOOGLE_APPLICATION_CREDENTIALS_JSON should be configured via local environment variables only.

Inicie o servidor:

npm run dev
2. Estrutura do Projeto
Integrações do Sistema
O sistema possui as seguintes integrações principais:

Firebase:

Firestore (banco de dados principal)
Realtime Database (autenticação facial, chat)
Storage (uploads de imagens e vídeos)
Authentication (login por email, Face ID)
Functions (funções customizadas, webhooks)
Google Genkit:

Fluxos de IA para tradução, verificação facial, automação
Pagamentos:

Mercado Pago (PIX, pagamentos nacionais)
PayPal (pagamentos internacionais)
Google Pay (botões oficiais, ambiente sandbox/teste)
Redes Sociais:

Facebook Graph API (feed, login, perfil)
Instagram Graph API (feed, loja)
Twitter API (feed, postagens)
Outros:

Integração com Vercel para deploy automático
Sentry/LogRocket/Vercel Analytics para monitoramento e logs
Cada integração está documentada nas seções específicas deste arquivo, com exemplos de uso, configuração e localização dos arquivos relacionados.

Localização dos Arquivos de Cada Integração
Integração	Arquivo(s) Principal(is)	Pasta/Localização
Firebase	firebase.ts, regras (firestore.rules, storage.rules)	src/services/, raiz do projeto
Firestore	firebase.ts, regras (firestore.rules)	src/services/, raiz
Realtime Database	firebase.ts, regras (database.rules.json)	src/services/, raiz
Storage	firebase.ts, regras (storage.rules)	src/services/, raiz
Authentication	firebase.ts, componentes de login	src/services/, src/components/FaceAuthButton.tsx, src/app/login/page.tsx
Functions	Funções (src/app/api/, functions/)	src/app/api/, functions/
Google Genkit	Fluxos IA (src/ai/flows/, genkit.ts)	src/ai/flows/, src/ai/genkit.ts
Mercado Pago	payments.ts, botões (PaymentButton.tsx)	src/services/, src/components/PaymentButton.tsx
PayPal	payments.ts, botões (PaymentButton.tsx)	src/services/, src/components/PaymentButton.tsx
Google Pay	payments.ts, botões (PaymentButton.tsx)	src/services/, src/components/PaymentButton.tsx
Facebook API	social.ts	src/services/social.ts
Instagram API	social.ts	src/services/social.ts
Twitter API	social.ts	src/services/social.ts
Vercel Deploy	deploy.sh, vercel.json	raiz do projeto
Monitoramento/Logs	Sentry/LogRocket config, funções customizadas	src/services/, raiz
Para detalhes e exemplos de uso, consulte as seções específicas deste documento e os arquivos indicados acima.

3. Regras de Segurança
Firestore: Leitura pública de produtos, fotos, vídeos e reviews aprovadas. Escrita apenas via painel admin (Admin SDK).
Realtime Database: Bloqueado por padrão. Permissões específicas para autenticação facial e chat.
Storage: Leitura pública, upload apenas autenticado (admin).
4. Variáveis de Ambiente (.env.local)
Adicione na raiz do projeto:

NEXT_PUBLIC_FIREBASE_API_KEY="..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="..."
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="..."
NEXT_PUBLIC_FIREBASE_DATABASE_URL="..."
MERCADOPAGO_PUBLIC_KEY="..."
MERCADOPAGO_ACCESS_TOKEN="..."
NEXT_PUBLIC_PAYPAL_CLIENT_ID="..."
PAYPAL_CLIENT_SECRET="..."
NEXT_PUBLIC_ENVIRONMENT="production"
NEXT_PUBLIC_PAYPAL_BUSINESS_EMAIL="..."
TWITTER_BEARER_TOKEN="..."
INSTAGRAM_FEED_ACCESS_TOKEN="..."
INSTAGRAM_SHOP_ACCESS_TOKEN="..."
FACEBOOK_PAGE_ACCESS_TOKEN="..."
GEMINI_API_KEY="..."
5. Instalação de Pacotes
Execute:

npm install
Principais dependências:

next
react
firebase
tailwindcss
shadcn/ui
genkit
mercado-pago
paypal-rest-sdk
axios
dotenv
6. Emulador e Servidor Local
Para testar Firebase localmente:

npm run dev
# Para emulador Firebase
firebase emulators:start --only firestore,functions,auth
7. Scripts Úteis
deploy.sh: Deploy automatizado para Vercel/Firebase
deploy-firebase.js: Deploy de regras e funções Firebase
download-face-api-models.js: Baixar modelos de IA facial
download-models.js: Baixar modelos de IA
8. Firebase Functions
Local: src/app/api/ e functions/
Funções customizadas para autenticação, pagamentos, integração IA, webhooks
Deploy:
firebase deploy --only functions
9. Banco de Dados
Firestore: Coleções: subscribers, payments, products, reviews, chats
Realtime Database: Autenticação facial, chat
Storage: Imagens, vídeos, uploads
10. Inteligência Artificial
Genkit: Fluxos em src/ai/flows/
Tradução, verificação facial, automação
Instalar dependências IA:
npm install @genkit-ai/core
11. Integrações API/SDK
Facebook Graph API: Feed, login, perfil
Instagram Graph API: Feed, loja
Twitter API: Feed, postagens
Mercado Pago: PIX, pagamentos
PayPal: Pagamentos internacionais
Google Pay: Botões oficiais, ambiente sandbox/teste
12. Sistemas e Bibliotecas
UI: ShadCN/UI, Tailwind
Autenticação: Firebase Auth, Face ID
Admin: Painel Next.js, rotas protegidas
Pagamentos: Mercado Pago, PayPal, Google Pay
IA: Genkit, face-api.js
API: Next.js API routes, Firebase Functions
Banco: Firestore, Realtime Database
Storage: Firebase Storage
13. Deploy
Vercel: Deploy automático via GitHub
Firebase: Deploy de regras, funções e storage
Configuração de variáveis: Manual no painel Vercel
14. Testes e Debug
Teste Google Pay: test-google-pay.html, test-google-pay (React)
Debug: public/debug-google-pay-callbacks.html
Logs detalhados no console
15. Referências e Ajuda
Next.js Docs
Firebase Docs
Genkit Docs
ShadCN/UI
Mercado Pago Docs
PayPal Docs
Google Pay Docs
16. Passo a Passo Inicial
Clone o repositório:
git clone <url-do-repo>
cd <pasta>
Instale dependências:
npm install
Crie .env.local conforme seção 3.
Inicie o servidor:
npm run dev
17. Configuração do Firebase Admin SDK
Crie um projeto no Firebase Console
Gere uma chave de serviço (serviceAccountKey.json)
Adicione o caminho da chave nas variáveis de ambiente:
GOOGLE_APPLICATION_CREDENTIALS="/caminho/serviceAccountKey.json"
18. Exemplos de Regras de Segurança
Firestore:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /products/{productId} {
      allow read: if true;
      allow write: if request.auth.token.email == "pix@italosantos.com";
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
Storage:

service firebase.storage {
  match /b/{bucket}/o {
    match /public/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
19. Exemplos de Integração API
Facebook Feed:

import axios from 'axios';
const url = `https://graph.facebook.com/v17.0/<page_id>/feed?access_token=${process.env.FACEBOOK_PAGE_ACCESS_TOKEN}`;
const res = await axios.get(url);
Mercado Pago PIX:

import MercadoPago from 'mercadopago';
const mp = new MercadoPago(process.env.MERCADOPAGO_ACCESS_TOKEN);
const payment_data = { transaction_amount: 99, payment_method_id: 'pix', payer: { email: 'user@email.com' } };
const payment = await mp.payment.create(payment_data);
20. Exemplo de Função Firebase
// src/app/api/hello/route.ts
export async function GET() {
  return Response.json({ message: 'Hello from Firebase Function!' });
}
21. Uso do Painel Admin
Acesse /admin com credenciais de admin
Gerencie produtos, fotos, vídeos, assinantes, avaliações
Ative/desative integrações e métodos de pagamento
22. Teste de Pagamentos
PIX: Gere QR Code e pague via Mercado Pago PayPal: Use sandbox para testes internacionais Google Pay: Teste em Android ou localhost conforme instruções

23. Exemplo de Fluxo IA Genkit
// src/ai/flows/translate.ts
import { translate } from '@genkit-ai/core';
export async function traduzir(texto, idioma) {
  return await translate(texto, { to: idioma });
}
24. Backup e Migração de Dados
Use Firebase Console para exportar/importar dados
Para Firestore: gcloud firestore export gs://<bucket>
Para Storage: Baixe arquivos pelo painel
25. Atualização de Dependências e Scripts
Atualize pacotes:
npm update
Teste scripts customizados após atualização
26. Dicas Finais
Sempre teste em ambiente de desenvolvimento antes de subir para produção
Mantenha backup das regras e credenciais
Use logs detalhados para debug
Documente novas integrações e scripts
27. Exemplos de Rotas Protegidas Next.js
// src/app/admin/page.tsx
import { getServerSession } from 'next-auth';
export default async function AdminPage() {
  const session = await getServerSession();
  if (!session || session.user.email !== 'pix@italosantos.com') {
    return <div>Acesso restrito</div>;
  }
  return <PainelAdmin />;
}
28. Permissões de Usuário (Admin vs Cliente)
Admin: email pix@italosantos.com, acesso total ao painel, escrita em Firestore
Cliente: acesso apenas à área de assinante, leitura pública
Controle via regras do Firebase e lógica nas rotas Next.js
29. Restaurar Backup em Ambiente Novo
Importe dados do Firestore pelo Console ou CLI
Importe arquivos do Storage pelo painel
Configure variáveis de ambiente e credenciais
Teste todas as integrações e permissões
30. Monitoramento de Erros e Logs em Produção
Use Vercel Analytics para monitorar requisições
Configure Firebase Crashlytics para erros críticos
Use logs customizados nas funções e APIs
Recomenda-se integração com Sentry ou LogRocket
31. Adicionar Novos Métodos de Pagamento ou IA
Para pagamentos: siga o padrão de integração de Mercado Pago/PayPal
Para IA: crie novo fluxo em src/ai/flows/ e registre no painel admin
Documente e teste cada novo recurso antes de liberar para produção
32. Exemplos Visuais do Painel Admin
Dashboard: estatísticas, gráficos de assinantes, vendas
Gerenciamento: tabelas de produtos, fotos, vídeos, avaliações
Upload: formulário para envio de mídia
Integrações: switches para ativar/desativar APIs
Logs: área para visualizar logs de ações e erros
33. Fluxo do Sistema (Diagrama Simplificado)
Unable to render rich display

Parse error on line 2:
... --> B[Autenticação (Face ID ou Email)]
-----------------------^
Expecting 'SQE', 'DOUBLECIRCLEEND', 'PE', '-)', 'STADIUMEND', 'SUBROUTINEEND', 'PIPE', 'CYLINDEREND', 'DIAMOND_STOP', 'TAGEND', 'TRAPEND', 'INVTRAPEND', 'UNICODE_TEXT', 'TEXT', 'TAGSTART', got 'PS'

For more information, see https://docs.github.com/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams#creating-mermaid-diagrams

flowchart TD
    A[Usuário acessa site] --> B[Autenticação (Face ID ou Email)]
    B --> C{Tipo de usuário}
    C -->|Admin| D[Painel Admin]
    C -->|Assinante| E[Área VIP]
    C -->|Visitante| F[Área Pública]
    D --> G[Gerenciar Produtos/Fotos/Vídeos]
    D --> H[Moderador de Avaliações]
    D --> I[Configurar Integrações]
    D --> J[Ver Estatísticas]
    E --> K[Galeria Exclusiva]
    E --> L[Pagamentos]
    L --> M[PIX/MercadoPago]
    L --> N[PayPal]
    L --> O[Google Pay]
    G --> P[Upload para Storage]
    F --> Q[Visualizar Conteúdo Público]
    D --> R[Logs/Admin]
    D --> S[Backup/Migração]
    D --> T[Configurar IA]
34. Itens Essenciais do Sistema
Next.js, TypeScript, Tailwind, ShadCN/UI
Firebase (Firestore, Storage, Auth, Functions)
Variáveis de ambiente
Scripts de deploy e backup
Painel admin protegido
Integração de pagamentos (PIX, PayPal, Google Pay)
IA (Genkit, face-api.js)
Regras de segurança
Testes e logs
Backup/migração de dados
35. Itens Não Essenciais (Opcional/Expansão)
Integração com redes sociais (Facebook, Instagram, Twitter)
Analytics avançado (Sentry, LogRocket, Vercel Analytics)
Novos métodos de pagamento (Stripe, Apple Pay)
Novos fluxos de IA (tradução, moderação, automação)
Customização visual avançada
Painel de relatórios customizados
Notificações push
Integração com apps mobile
Automação de marketing
Plugins de terceiros
36. Localização de Itens, Textos, Botões e Funções nos Componentes e Páginas
Estrutura de Componentes e Páginas
src/app/

/page.tsx: Página pública principal (home, textos institucionais, botões de login/assinatura)
/admin/page.tsx: Painel admin (dashboard, tabelas, botões de gerenciamento, gráficos, logs)
/vip/page.tsx: Área VIP do assinante (galeria exclusiva, botões de pagamento, conteúdo restrito)
/login/page.tsx: Autenticação (Face ID, email, botões de login)
/api/: Rotas de API (funções Next.js, integração com Firebase Functions, pagamentos, IA)
src/components/

Header.tsx: Cabeçalho, navegação, botões de login/logout, links principais
Footer.tsx: Rodapé, textos institucionais, links de redes sociais
ProductTable.tsx: Tabela de produtos (admin), botões de editar/excluir/adicionar
PhotoGallery.tsx: Galeria de fotos/vídeos (VIP e público), botões de upload (admin)
PaymentButton.tsx: Botões de pagamento (PIX, PayPal, Google Pay)
FaceAuthButton.tsx: Botão de autenticação facial
IntegrationSwitch.tsx: Switches para ativar/desativar integrações (admin)
StatsDashboard.tsx: Gráficos e estatísticas (admin)
ReviewModerator.tsx: Moderação de avaliações (admin), botões de aprovar/reprovar
BackupButton.tsx: Botão para backup/migração (admin)
LogViewer.tsx: Visualização de logs (admin)
IAConfigForm.tsx: Formulário para configurar fluxos de IA (admin)
NotificationPanel.tsx: Painel de notificações (opcional)
src/services/

firebase.ts: Funções de integração com Firebase (auth, firestore, storage, functions)
payments.ts: Funções de integração com Mercado Pago, PayPal, Google Pay
ai.ts: Funções de integração com Genkit e face-api.js
social.ts: Funções de integração com Facebook, Instagram, Twitter
src/lib/

Utilitários, helpers, validações, formatação de dados
Exemplos de Localização de Funções e Botões
Botão "Login": Header.tsx e /login/page.tsx
Botão "Assinar": /vip/page.tsx, PaymentButton.tsx
Botão "Upload": PhotoGallery.tsx (admin), /admin/page.tsx
Botão "Backup": BackupButton.tsx, /admin/page.tsx
Botão "Ativar Integração": IntegrationSwitch.tsx, /admin/page.tsx
Botão "Configurar IA": IAConfigForm.tsx, /admin/page.tsx
Botão "Ver Logs": LogViewer.tsx, /admin/page.tsx
Botão "Aprovar Avaliação": ReviewModerator.tsx, /admin/page.tsx
Botão "Pagar com PIX/PayPal/Google Pay": PaymentButton.tsx, /vip/page.tsx
Botão "Logout": Header.tsx
Textos e Informações
Textos institucionais: /page.tsx, Footer.tsx
Textos de instrução: Login, Assinatura, Admin (em cada respectivo componente/página)
Textos de erro/sucesso: Em cada componente de ação (ex: pagamentos, uploads, autenticação)
Textos de status: Dashboard, tabelas, logs, notificações
Funções Principais
Autenticação: firebase.ts, FaceAuthButton.tsx, /login/page.tsx
Gerenciamento de produtos/fotos/vídeos: ProductTable.tsx, PhotoGallery.tsx, /admin/page.tsx
Pagamentos: payments.ts, PaymentButton.tsx, /vip/page.tsx
Integrações: social.ts, IntegrationSwitch.tsx, /admin/page.tsx
IA: ai.ts, IAConfigForm.tsx, /admin/page.tsx
Backup/Migração: BackupButton.tsx, /admin/page.tsx
Logs: LogViewer.tsx, /admin/page.tsx
Notificações: NotificationPanel.tsx (opcional)
37. Exemplos de Importação dos Principais Componentes e Serviços
Exemplos de Importação de Componentes
// src/app/page.tsx
import Header from '../components/Header';
import Footer from '../components/Footer';
import PaymentButton from '../components/PaymentButton';
import PhotoGallery from '../components/PhotoGallery';
// src/app/admin/page.tsx
import ProductTable from '../../components/ProductTable';
import StatsDashboard from '../../components/StatsDashboard';
import IntegrationSwitch from '../../components/IntegrationSwitch';
import BackupButton from '../../components/BackupButton';
import LogViewer from '../../components/LogViewer';
import IAConfigForm from '../../components/IAConfigForm';
import ReviewModerator from '../../components/ReviewModerator';
// src/app/vip/page.tsx
import PhotoGallery from '../../components/PhotoGallery';
import PaymentButton from '../../components/PaymentButton';
Exemplos de Importação de Serviços
// src/app/api/payments.ts
import { processPixPayment, processPaypalPayment } from '../../services/payments';

// src/app/api/auth.ts
import { signInWithFaceId, signInWithEmail } from '../../services/firebase';

// src/app/api/ai.ts
import { runGenkitFlow } from '../../services/ai';

// src/app/api/social.ts
import { fetchInstagramFeed, fetchFacebookFeed } from '../../services/social';
Exemplos de Importação de Utilitários
// src/app/api/utils.ts
import { formatDate, validateEmail } from '../../lib/utils';
Esses exemplos mostram como importar os componentes, serviços e utilitários em suas páginas e APIs.

Paleta de Cores e Efeitos Visuais
O sistema utiliza as seguintes cores principais:

Preto: Fundo principal das páginas, painéis e áreas VIP (bg-black, text-white)
Branco: Textos, botões, áreas de destaque (bg-white, text-black)
Cinza: Bordas, backgrounds secundários, cards, tabelas (bg-gray-900, bg-gray-800, bg-gray-700, text-gray-300, border-gray-600)
Neon: Efeito visual em botões de ação, títulos principais e elementos de destaque.
Exemplo de Neon:
Cor: #00ffe7 (azul neon) ou #39ff14 (verde neon)
Utilizado em:
Botão "Assinar" na área VIP (PaymentButton.tsx)
Títulos principais (Header.tsx)
Borda animada em cards de destaque
Hover em botões de pagamento
Como aplicar o efeito neon no Tailwind CSS:

// Exemplo de botão neon
<button className="bg-black text-neon-green border-2 border-neon-green shadow-neon-green hover:shadow-lg hover:border-white transition-all">
  Assinar VIP
</button>

// Adicione ao tailwind.config.js:
module.exports = {
  theme: {
    extend: {
      colors: {
        'neon-green': '#39ff14',
        'neon-blue': '#00ffe7',
      },
      boxShadow: {
        'neon-green': '0 0 10px #39ff14, 0 0 20px #39ff14',
        'neon-blue': '0 0 10px #00ffe7, 0 0 20px #00ffe7',
      },
    },
  },
}
Onde o efeito neon aparece:

Botão "Assinar" (VIP)
Botões de pagamento (PIX, PayPal, Google Pay)
Títulos principais do painel admin
Cards de destaque na home
Hover em botões de ação
Itens do Menu Hamburguer
O menu hamburguer (geralmente em Header.tsx ou MobileMenu.tsx) contém os seguintes itens:

Home:
Vai para /page.tsx (página principal)
Mostra textos institucionais, destaques, cards, galeria pública
Assinar VIP:
Vai para /vip/page.tsx
Mostra galeria exclusiva, botões de pagamento, informações de assinatura
Login:
Vai para /login/page.tsx
Permite autenticação por Face ID ou email
Admin:
Vai para /admin/page.tsx (apenas para admin)
Dashboard, gerenciamento de produtos, fotos, vídeos, avaliações, integrações, backup, logs
Galeria:
Vai para /gallery/page.tsx ou componente PhotoGallery.tsx
Mostra fotos e vídeos públicas ou VIP
Pagamentos:
Vai para /vip/page.tsx ou componente PaymentButton.tsx
Botões de PIX, PayPal, Google Pay
Integrações:
Vai para /admin/page.tsx (admin)
Switches para ativar/desativar Facebook, Instagram, Twitter
Configurações:
Vai para /admin/settings.tsx ou modal de configurações
Permite editar perfil, dados, preferências, IA
Logout:
Executa função de logout (em Header.tsx ou firebase.ts)
Redireciona para home
Cada item do menu hamburguer está ligado a uma página ou componente específico, facilitando a navegação e o acesso às principais funcionalidades do sistema.

Itens de Fetiche no Menu Hamburguer
Além dos itens principais, o menu hamburguer pode conter seções dedicadas a fetiches, permitindo que assinantes e visitantes naveguem por categorias específicas de conteúdo. Exemplos de itens de fetiche e suas respectivas páginas/funções:

Fetiche - Pés:

Página: /fetiche/pes/page.tsx
Mostra galeria exclusiva de fotos e vídeos de pés, opção de assinatura VIP, botões de pagamento
Fetiche - BDSM:

Página: /fetiche/bdsm/page.tsx
Conteúdo temático, galeria, informações, assinatura VIP
Fetiche - Uniforme:

Página: /fetiche/uniforme/page.tsx
Galeria de fotos e vídeos com uniformes, opção de assinatura
Fetiche - Cosplay:

Página: /fetiche/cosplay/page.tsx
Conteúdo de cosplay, galeria, assinatura VIP
Fetiche - Dominação:

Página: /fetiche/dominacao/page.tsx
Conteúdo exclusivo, informações, assinatura
Fetiche - Outros:

Página: /fetiche/outros/page.tsx
Galeria de outros fetiches, opção de sugestão de novos temas
Cada item de fetiche pode ser exibido como submenu ou categoria especial no menu hamburguer, levando o usuário diretamente para a página temática, onde é possível visualizar conteúdo, assinar VIP, interagir e realizar pagamentos.

Lista Ampliada de Fetiches e Fantasias
O sistema suporta centenas de categorias de fetiche e fantasia, todas organizadas dinamicamente no menu hamburguer. Exemplos de categorias disponíveis:

Pés
BDSM
Uniforme
Cosplay
Dominação
Outros
Latex
Couro
Fantasia de Enfermeira
Fantasia de Policial
Fantasia de Estudante
Fantasia de Super-Herói
Roleplay
Voyeur
Exibição
Bondage
Spanking
Sadomasoquismo
Submissão
Dominatrix
Crossdressing
Furry
Infantilização
Adult Baby
Age Play
Pet Play
Pony Play
Ballbusting
Chuva Dourada
Cuckold
Humilhação
Facesitting
Pegging
Strap-on
Sensory Play
Wax Play
Electro Play
Medical Play
Tickle
Food Play
Oil Play
Massagem Erótica
Striptease
Exibição Pública
Masturbação
Sexo Virtual
Sexting
Fantasia de Anjo
Fantasia de Diabo
Fantasia de Coelho
Fantasia de Gato
Fantasia de Pirata
Fantasia de Princesa
Fantasia de Bruxa
Fantasia de Zumbi
Fantasia de Palhaço
Fantasia de Militar
Fantasia de Marinheiro
Fantasia de Bombeiro
Fantasia de Motociclista
Fantasia de Dançarina
Fantasia de Professora
Fantasia de Secretária
Fantasia de Chef
Fantasia de Jogadora
Fantasia de Gamer
Fantasia de Animadora
Fantasia de Atleta
Fantasia de Lutadora
Fantasia de Samurai
Fantasia de Ninja
Fantasia de Geisha
Fantasia de Egípcia
Fantasia de Grega
Fantasia de Romana
Fantasia de Viking
Fantasia de Medieval
Fantasia de Steampunk
Fantasia de Cyberpunk
Fantasia de Alien
Fantasia de Robô
Fantasia de Monstro
Fantasia de Fada
Fantasia de Sereia
Fantasia de Pirata
Fantasia de Cavaleira
Fantasia de Rainha
Fantasia de Rei
Fantasia de Príncipe
Fantasia de Prisioneira
Fantasia de Detetive
Fantasia de Cientista
Fantasia de Astronauta
Fantasia de Surfista
Fantasia de Skatista
Fantasia de Bailarina
Fantasia de Cantora
Fantasia de DJ
Fantasia de Celebridade
Fantasia de Influencer
Fantasia de Youtuber
Fantasia de Streamer
Fantasia de TikToker
Fantasia de Modelo
Fantasia de Fotógrafa
Fantasia de Pintora
Fantasia de Escritora
Fantasia de Jornalista
Fantasia de Advogada
Fantasia de Médica
Fantasia de Dentista
Fantasia de Veterinária
Fantasia de Psicóloga
Fantasia de Engenheira
Fantasia de Arquiteta
Fantasia de Empresária
Fantasia de Executiva
Fantasia de Policial
Fantasia de Bombeira
Fantasia de Militar
Fantasia de Marinheira
Fantasia de Motociclista
Fantasia de Dançarina
Fantasia de Professora
Fantasia de Secretária
Fantasia de Chef
Fantasia de Jogadora
Fantasia de Gamer
Fantasia de Animadora
Fantasia de Atleta
Fantasia de Lutadora
Fantasia de Samurai
Fantasia de Ninja
Fantasia de Geisha
Fantasia de Egípcia
Fantasia de Grega
Fantasia de Romana
Fantasia de Viking
Fantasia de Medieval
Fantasia de Steampunk
Fantasia de Cyberpunk
Fantasia de Alien
Fantasia de Robô
Fantasia de Monstro
Fantasia de Fada
Fantasia de Sereia
...e muitos outros! Novas categorias podem ser adicionadas facilmente pelo painel admin, e cada uma possui sua própria página temática, galeria, opções de assinatura VIP e botões de pagamento.

Exemplos Específicos de Fetiches e Fantasias
Fetiche - Pés
Página: /fetiche/pes/page.tsx
Função: Galeria exclusiva de fotos e vídeos de pés, botão "Assinar VIP", botões de pagamento (PIX, PayPal, Google Pay)
Exemplo de botão:
<button className="bg-black text-neon-green border-2 border-neon-green shadow-neon-green">Assinar VIP Fetiche Pés</button>
Fantasia - Enfermeira
Página: /fantasia/enfermeira/page.tsx
Função: Galeria temática, opção de assinatura VIP, formulário para pedidos personalizados
Exemplo de botão:
<button className="bg-black text-neon-blue border-2 border-neon-blue shadow-neon-blue">Assinar VIP Fantasia Enfermeira</button>
Fetiche - BDSM
Página: /fetiche/bdsm/page.tsx
Função: Conteúdo temático, vídeos, chat privado, assinatura VIP
Exemplo de botão:
<button className="bg-black text-neon-green border-2 border-neon-green">Entrar no Chat BDSM VIP</button>
Fantasia - Cosplay
Página: /fantasia/cosplay/page.tsx
Função: Galeria de fotos e vídeos de cosplay, opção de assinatura VIP, pedidos de fantasias personalizadas
Exemplo de botão:
<button className="bg-black text-neon-blue border-2 border-neon-blue">Assinar VIP Cosplay</button>
Fetiche - Dominação
Página: /fetiche/dominacao/page.tsx
Função: Conteúdo exclusivo, vídeos, chat, assinatura VIP
Exemplo de botão:
<button className="bg-black text-neon-green border-2 border-neon-green">Assinar VIP Dominação</button>
Fantasia - Super-Herói
Página: /fantasia/superheroi/page.tsx
Função: Galeria temática, vídeos, pedidos personalizados, assinatura VIP
Exemplo de botão:
<button className="bg-black text-neon-blue border-2 border-neon-blue">Assinar VIP Super-Herói</button>
Esses exemplos mostram como cada categoria pode ter sua própria página, galeria, botões de assinatura VIP e funções específicas, facilitando a navegação e monetização de conteúdos temáticos.

Exemplos Específicos de Todas as Áreas do Sistema
Cadastro de Usuário
Página: /login/page.tsx Função: Cadastro por email ou Face ID Exemplo:

import { signInWithEmail, signInWithFaceId } from '../../services/firebase';
// Formulário de cadastro
Login
Página: /login/page.tsx Função: Login por email ou Face ID Exemplo:

<button onClick={signInWithEmail}>Entrar com Email</button>
<button onClick={signInWithFaceId}>Entrar com Face ID</button>
Upload de Conteúdo
Página: /admin/page.tsx, componente: PhotoGallery.tsx Função: Upload de fotos e vídeos Exemplo:

import PhotoGallery from '../components/PhotoGallery';
<PhotoGallery onUpload={handleUpload} />
Pagamento (PIX, PayPal, Google Pay)
Página: /vip/page.tsx, componente: PaymentButton.tsx Função: Assinatura VIP, compra de conteúdo Exemplo:

import PaymentButton from '../components/PaymentButton';
<PaymentButton method="pix" />
<PaymentButton method="paypal" />
<PaymentButton method="googlepay" />
Integração com Redes Sociais
Serviço: social.ts Função: Buscar feed do Instagram, Facebook, Twitter Exemplo:

import { fetchInstagramFeed, fetchFacebookFeed, fetchTwitterFeed } from '../../services/social';
const instagram = await fetchInstagramFeed();
Painel Admin
Página: /admin/page.tsx Função: Gerenciar produtos, fotos, vídeos, assinantes, avaliações Exemplo:

import ProductTable from '../../components/ProductTable';
import StatsDashboard from '../../components/StatsDashboard';
<ProductTable />
<StatsDashboard />
Fluxo de IA (Genkit)
Arquivo: src/ai/flows/translate.ts Função: Tradução automática Exemplo:

import { translate } from '@genkit-ai/core';
const resultado = await translate('Olá', { to: 'en' });
Backup e Migração
Script: deploy-firebase.js, botão: BackupButton.tsx Função: Exportar/importar dados do Firestore e Storage Exemplo:

import BackupButton from '../../components/BackupButton';
<BackupButton />
Menu Hamburguer
Componente: Header.tsx, MobileMenu.tsx Função: Navegação entre páginas principais e fetiches Exemplo:

import Header from '../components/Header';
<Header />
Fetiche/Fantasia
Página: /fetiche/pes/page.tsx, /fantasia/enfermeira/page.tsx Função: Galeria temática, assinatura VIP Exemplo:

<button className="bg-black text-neon-green">Assinar VIP Fetiche Pés</button>
<button className="bg-black text-neon-blue">Assinar VIP Fantasia Enfermeira</button>
Logout
Componente: Header.tsx, serviço: firebase.ts Função: Encerrar sessão e redirecionar para home Exemplo:

import { signOut } from '../../services/firebase';
<button onClick={signOut}>Logout</button>
Notificações
Componente: NotificationPanel.tsx Função: Exibir notificações para o usuário Exemplo:

import NotificationPanel from '../../components/NotificationPanel';
<NotificationPanel />
Esses exemplos cobrem as principais áreas do sistema, mostrando como implementar cada funcionalidade com componentes, serviços e páginas específicas.

Especificações Detalhadas dos Caminhos de Cada Página, Componente, Serviço e Item
Estrutura de Diretórios e Caminhos
Páginas (src/app/)
src/app/page.tsx: Página inicial pública (home)
src/app/admin/page.tsx: Painel admin
src/app/vip/page.tsx: Área VIP do assinante
src/app/login/page.tsx: Autenticação (Face ID, email)
src/app/gallery/page.tsx: Galeria pública/VIP
src/app/api/: Rotas de API (ex: src/app/api/payments.ts, src/app/api/hello/route.ts)
src/app/fetiche/[categoria]/page.tsx: Página de fetiche específica (ex: src/app/fetiche/pes/page.tsx)
src/app/fantasia/[categoria]/page.tsx: Página de fantasia específica (ex: src/app/fantasia/enfermeira/page.tsx)
src/app/admin/settings.tsx: Configurações do admin
Componentes (src/components/)
src/components/Header.tsx: Cabeçalho, menu hamburguer
src/components/Footer.tsx: Rodapé
src/components/ProductTable.tsx: Tabela de produtos
src/components/PhotoGallery.tsx: Galeria de fotos/vídeos
src/components/PaymentButton.tsx: Botões de pagamento
src/components/FaceAuthButton.tsx: Autenticação facial
src/components/IntegrationSwitch.tsx: Switches de integrações
src/components/StatsDashboard.tsx: Gráficos e estatísticas
src/components/ReviewModerator.tsx: Moderação de avaliações
src/components/BackupButton.tsx: Backup/migração
src/components/LogViewer.tsx: Visualização de logs
src/components/IAConfigForm.tsx: Configuração de IA
src/components/NotificationPanel.tsx: Notificações
Serviços (src/services/)
src/services/firebase.ts: Integração com Firebase (auth, firestore, storage, functions)
src/services/payments.ts: Integração com Mercado Pago, PayPal, Google Pay
src/services/ai.ts: Integração com Genkit, face-api.js
src/services/social.ts: Integração com Facebook, Instagram, Twitter
Utilitários (src/lib/)
src/lib/utils.ts: Funções utilitárias (formatação, validação)
Funções Customizadas (functions/)
functions/index.js: Funções Firebase Functions customizadas
Assets Públicos (public/)
public/: Imagens, ícones, scripts de teste, sw.js
public/firebase-messaging-sw.js: Service Worker do Firebase Messaging
public/test-upload-script.js: Script de teste de upload
Documentação (docs/)
docs/ORIENTACAO_GERAL.md: Orientação geral do sistema
docs/DEPLOY_VERCEL.md: Instruções de deploy Vercel
docs/GOOGLE_PAY_BOTOES_OFICIAIS.md: Detalhes sobre Google Pay
Configurações e Scripts (raiz do projeto)
.env.local: Variáveis de ambiente
firebase.json: Configuração do Firebase
firestore.rules: Regras de segurança Firestore
storage.rules: Regras de segurança Storage
database.rules.json: Regras de segurança Realtime Database
deploy.sh: Script de deploy automatizado
deploy-firebase.js: Script de deploy Firebase
next.config.js / next.config.mjs: Configuração do Next.js
tailwind.config.ts / tailwind.config.js: Configuração do Tailwind CSS
vercel.json: Configuração do Vercel
Exemplos de Caminhos Específicos
Firestore (firestore.rules):
Leitura: A leitura de dados públicos (produtos, fotos, vídeos, reviews aprovadas) é permitida para todos.
Escrita: Nenhuma escrita é permitida diretamente pelo cliente. Todas as modificações de dados são feitas de forma segura através do painel de administração, que utiliza credenciais de administrador no servidor (Admin SDK).
Realtime Database (database.rules.json):
Padrão: Todo o banco de dados é bloqueado para leitura e escrita por padrão.
Exceções: Apenas os dados de facialAuth/users (para verificação de login) e as conversas do chat (acessíveis apenas pelos participantes da conversa) têm permissões específicas.
Storage (storage.rules):
Leitura: A leitura de arquivos é pública para que as imagens e vídeos do site possam ser exibidos.
Escrita: O upload de novos arquivos é permitido apenas para usuários autenticados, o que na prática restringe essa ação ao painel de administração.
Página de fetiche "Pés": src/app/fetiche/pes/page.tsx
Página de fantasia "Enfermeira": src/app/fantasia/enfermeira/page.tsx
Botão de pagamento: src/components/PaymentButton.tsx
Serviço de IA: src/services/ai.ts
Função de backup: src/components/BackupButton.tsx
API de pagamentos: src/app/api/payments.ts
Script de deploy: deploy.sh
Regras do Firestore: firestore.rules
Documentação de deploy: docs/DEPLOY_VERCEL.md
4. Pagamentos
PIX (via Mercado Pago): Um modal customizado permite que clientes no Brasil gerem um QR Code PIX para pagamento.
PayPal: Um botão de pagamento direciona para o checkout do PayPal para pagamentos internacionais.
Variáveis de Ambiente (.env.local)
Para que o projeto funcione localmente, crie um arquivo .env.local na raiz e adicione as seguintes variáveis:

# Firebase (Cliente)
NEXT_PUBLIC_FIREBASE_API_KEY="AIza..."
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY="TEST-..."

# Firebase (Servidor - Admin SDK)
# Geralmente gerenciado pelo ambiente de hospedagem (ex: App Hosting)
# GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/serviceAccountKey.json"

# APIs de Terceiros
FACEBOOK_PAGE_ACCESS_TOKEN="EAA..."
INSTAGRAM_FEED_ACCESS_TOKEN="IGQVJ..."
INSTAGRAM_SHOP_ACCESS_TOKEN="IGQVJ..."
TWITTER_BEARER_TOKEN="AAAAA..."
MERCADOPAGO_ACCESS_TOKEN="APP_USR-..."
PAYPAL_CLIENT_ID="AZ..."
PAYPAL_CLIENT_SECRET="E..."

# Segurança dos Webhooks
GOOGLE_SHEETS_WEBHOOK_SECRET="seu_token_secreto_aqui"

# Cloudflare (Chat Externo - Se aplicável)
CLOUDFLARE_ORG_ID="..."
.# italosantos-com

italosantos
italosantos
Estrutura Resumida
src/app/
  page.tsx
  admin/page.tsx
  vip/page.tsx
  login/page.tsx
  gallery/page.tsx
  api/
  fetiche/[categoria]/page.tsx
  fantasia/[categoria]/page.tsx
  admin/settings.tsx
src/components/
  Header.tsx
  Footer.tsx
  ProductTable.tsx
  PhotoGallery.tsx
  PaymentButton.tsx
  FaceAuthButton.tsx
  IntegrationSwitch.tsx
  StatsDashboard.tsx
  ReviewModerator.tsx
  BackupButton.tsx
  LogViewer.tsx
  IAConfigForm.tsx
  NotificationPanel.tsx
src/services/
  firebase.ts
  payments.ts
  ai.ts
  social.ts
src/lib/
  utils.ts
functions/
  index.js
public/
  ...
docs/
  ...
.env.local
firebase.json
firestore.rules
storage.rules
database.rules.json
deploy.sh
deploy-firebase.js
next.config.js
tailwind.config.ts
vercel.json

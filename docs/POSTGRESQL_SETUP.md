# 🐘 PostgreSQL Setup - Chat Unificado Multi-Canal

## ⚠️ ERRO: `Environment variable not found: DATABASE_URL`

Este erro ocorre porque o **Prisma** (usado para armazenar mensagens das redes sociais) requer uma conexão com banco de dados **PostgreSQL**.

---

## ✅ SOLUÇÃO RÁPIDA

### Opção 1: PostgreSQL Local (Recomendado para desenvolvimento)

#### 1. Instalar PostgreSQL

**macOS (Homebrew):**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Verificar instalação:**
```bash
psql --version
# Deve mostrar: psql (PostgreSQL) 16.x
```

#### 2. Criar banco de dados

```bash
# Entrar no PostgreSQL
psql postgres

# Dentro do psql:
CREATE DATABASE italosantos;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE italosantos TO postgres;
\q
```

#### 3. Testar conexão

```bash
psql -U postgres -d italosantos -h localhost
# Senha: postgres
# Se conectar com sucesso, está funcionando!
\q
```

#### 4. Rodar migração Prisma

```bash
cd "/Users/italosanta/Downloads/italosantos.com original"
npx prisma migrate dev --name add_multichat_support
npx prisma generate
```

#### 5. Iniciar aplicação

```bash
npm run dev
```

---

### Opção 2: PostgreSQL via Docker (Mais simples)

```bash
# Criar container PostgreSQL
docker run --name italosantos-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=italosantos \
  -p 5432:5432 \
  -d postgres:16-alpine

# Verificar se está rodando
docker ps | grep italosantos-postgres

# Rodar migração
npx prisma migrate dev --name add_multichat_support
npx prisma generate

# Iniciar aplicação
npm run dev
```

**Para parar/iniciar depois:**
```bash
docker stop italosantos-postgres
docker start italosantos-postgres
```

---

### Opção 3: Neon.tech (PostgreSQL na nuvem - GRÁTIS)

1. Acesse: https://neon.tech
2. Crie conta gratuita
3. Crie novo projeto: `italosantos-chat`
4. Copie a **Connection String** (formato: `postgresql://user:pass@host.neon.tech/dbname`)
5. Cole no `.env.local`:

```bash
DATABASE_URL=postgresql://user:pass@host.neon.tech/dbname?sslmode=require
```

6. Rode migração:
```bash
npx prisma migrate dev --name add_multichat_support
npx prisma generate
npm run dev
```

---

## 📝 Variáveis Adicionadas ao .env.local

Já adicionei estas variáveis no seu `.env.local`:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/italosantos
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=change_me_in_production_use_openssl_rand_base64_32
```

**⚠️ IMPORTANTE:**
- Se usar Docker ou Neon, **atualize** `DATABASE_URL` com a conexão correta
- Antes de deploy em produção, **mude** `NEXTAUTH_SECRET` para valor seguro:
  ```bash
  openssl rand -base64 32
  ```

---

## 🧪 Verificar se Está Funcionando

### 1. Testar conexão Prisma:
```bash
npx prisma db pull
# Se conectar sem erro, DATABASE_URL está correto!
```

### 2. Ver schema no Prisma Studio:
```bash
npx prisma studio
# Abre interface web em http://localhost:5555
# Você deve ver as tabelas: User, Message, SocialChannelBinding, etc.
```

### 3. Testar aplicação:
```bash
npm run dev
# Acesse: http://localhost:3000/admin/conversations
# Aba "Chat Unificado (Multi-Canal)" deve carregar sem erro
```

---

## ❓ Troubleshooting

### Erro: "Connection refused"
**Causa:** PostgreSQL não está rodando

**Solução:**
```bash
# macOS Homebrew:
brew services start postgresql@16

# Docker:
docker start italosantos-postgres

# Verificar se porta 5432 está aberta:
lsof -i :5432
```

### Erro: "password authentication failed"
**Causa:** Senha ou usuário incorretos

**Solução:**
```bash
# Resetar senha do usuário postgres:
psql postgres
ALTER USER postgres WITH PASSWORD 'postgres';
\q
```

### Erro: "database does not exist"
**Causa:** Banco `italosantos` não foi criado

**Solução:**
```bash
psql postgres
CREATE DATABASE italosantos;
\q
```

### Erro: "SSL connection required"
**Causa:** Neon.tech ou outro provedor na nuvem requer SSL

**Solução:**
```bash
# Adicionar ?sslmode=require na DATABASE_URL:
DATABASE_URL=postgresql://user:pass@host.neon.tech/dbname?sslmode=require
```

---

## 🚀 Próximos Passos

Após configurar PostgreSQL:

1. ✅ Rodar migração: `npx prisma migrate dev`
2. ✅ Gerar cliente: `npx prisma generate`
3. ✅ Iniciar app: `npm run dev`
4. ✅ Acessar: http://localhost:3000/admin/conversations
5. ✅ Testar chat unificado multi-canal

---

## 📚 Documentação Completa

Para mais informações sobre o sistema de chat:
- `/docs/MULTICHAT_COMPLETE.md` - Documentação completa
- `/docs/QUICK_START_MULTICHAT.md` - Guia rápido
- `env.template` - Lista completa de variáveis

---

**Status:** ⚠️ **AGUARDANDO CONFIGURAÇÃO DO POSTGRESQL**  
Escolha uma das opções acima e siga os passos!

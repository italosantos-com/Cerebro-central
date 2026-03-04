# Integração Facebook OpenAPI

## Visão Geral

Este diretório contém as especificações OpenAPI oficiais da Meta para as APIs do Facebook, especificamente para a **API de Business Messaging do WhatsApp**.

A especificação OpenAPI foi obtida do repositório oficial da Meta:
- **Repositório**: https://github.com/facebook/openapi
- **Versão**: v23.0
- **Licença**: MIT

## Conteúdo

### Arquivos Incluídos

- **`business-messaging-api_v23.0.yaml`**: Especificação completa da API de Business Messaging do WhatsApp
- **`LICENSE`**: Licença MIT do projeto
- **`README.md`**: README original do repositório Facebook OpenAPI

## Para que serve?

A especificação OpenAPI é um formato padrão da indústria para descrever APIs REST. Com ela, você pode:

### 1. Gerar SDKs Automaticamente

Utilize ferramentas como [OpenAPI Generator](https://openapi-generator.tech/) para gerar SDKs em diversas linguagens:

```bash
# Instalar OpenAPI Generator
npm install @openapitools/openapi-generator-cli -g

# Gerar SDK para Node.js/TypeScript
openapi-generator-cli generate \
  -i openapi/business-messaging-api_v23.0.yaml \
  -g typescript-axios \
  -o src/generated/whatsapp-sdk
```

### 2. Documentação Interativa

Utilize ferramentas de documentação como:

#### Swagger UI
```bash
npm install swagger-ui-express

# Em seu servidor Express/Next.js API:
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

const swaggerDocument = YAML.load('./openapi/business-messaging-api_v23.0.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
```

#### Redoc
```bash
npm install redoc-cli

# Gerar documentação HTML estática
redoc-cli bundle openapi/business-messaging-api_v23.0.yaml \
  -o docs/whatsapp-api.html
```

### 3. Validação de Requisições/Respostas

Use a especificação para validar requests e responses automaticamente:

```bash
npm install express-openapi-validator

# No seu servidor
import * as OpenApiValidator from 'express-openapi-validator';

app.use(
  OpenApiValidator.middleware({
    apiSpec: './openapi/business-messaging-api_v23.0.yaml',
    validateRequests: true,
    validateResponses: true,
  }),
);
```

### 4. Type-Safety com TypeScript

Gere tipos TypeScript a partir da especificação:

```bash
npm install openapi-typescript

# Gerar tipos
npx openapi-typescript openapi/business-messaging-api_v23.0.yaml \
  --output src/types/whatsapp-api.d.ts
```

## WhatsApp Business API

A especificação incluída é para a **WhatsApp Business API**, que permite:

- 📱 Enviar mensagens de texto, mídia e templates
- 💬 Receber mensagens de clientes
- 📊 Obter métricas e analytics
- 🔔 Configurar webhooks para notificações
- ✅ Gerenciar status de leitura
- 📝 Criar e gerenciar templates de mensagens

### Documentação Oficial

Para mais informações sobre a API, consulte:
- [WhatsApp Business API - Documentação](https://developers.facebook.com/docs/whatsapp)
- [Business Messaging Overview](https://developers.facebook.com/documentation/business-messaging/whatsapp/overview)

## Como Usar no Projeto

### 1. Configuração Inicial

Certifique-se de ter as credenciais necessárias no arquivo `.env`:

```env
# WhatsApp Business API
WHATSAPP_BUSINESS_ACCOUNT_ID=seu_account_id
WHATSAPP_PHONE_NUMBER_ID=seu_phone_number_id
WHATSAPP_ACCESS_TOKEN=seu_access_token
WHATSAPP_VERIFY_TOKEN=seu_verify_token
```

### 2. Exemplo de Integração

```typescript
// src/services/whatsapp-service.ts
import axios from 'axios';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v23.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

export async function sendWhatsAppMessage(to: string, message: string) {
  try {
    const response = await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: {
          body: message
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Erro ao enviar mensagem WhatsApp:', error);
    throw error;
  }
}
```

### 3. Webhook para Receber Mensagens

```typescript
// src/app/api/webhooks/whatsapp/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Verificar token de verificação
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('Webhook verificado com sucesso!');
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Processar mensagem recebida
    if (body.object === 'whatsapp_business_account') {
      body.entry?.forEach((entry: any) => {
        entry.changes?.forEach((change: any) => {
          if (change.field === 'messages') {
            const messages = change.value.messages;
            messages?.forEach((message: any) => {
              console.log('Mensagem recebida:', message);
              // Processar mensagem aqui
            });
          }
        });
      });
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

## Ferramentas Recomendadas

### Desenvolvimento
- **[Insomnia](https://insomnia.rest/)** ou **[Postman](https://www.postman.com/)**: Importar a especificação OpenAPI para testar endpoints
- **[VS Code REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)**: Testar APIs diretamente do VS Code

### Geração de Código
- **[OpenAPI Generator](https://openapi-generator.tech/)**: Gerar SDKs em múltiplas linguagens
- **[openapi-typescript](https://www.npmjs.com/package/openapi-typescript)**: Gerar tipos TypeScript

### Documentação
- **[Swagger UI](https://swagger.io/tools/swagger-ui/)**: Interface interativa para explorar a API
- **[Redoc](https://redocly.com/redoc/)**: Documentação bonita e responsiva
- **[Stoplight](https://stoplight.io/)**: Plataforma completa para design e documentação de APIs

## Atualização da Especificação

Para atualizar a especificação quando uma nova versão for lançada:

```bash
# Clone o repositório atualizado
cd /tmp
git clone https://github.com/facebook/openapi.git facebook-openapi

# Copie a nova versão
cp facebook-openapi/business-messaging-api_v*.yaml \
   /caminho/para/seu/projeto/openapi/

# Limpe o temporário
rm -rf facebook-openapi
```

## Notas Importantes

⚠️ **Termos e Condições**: O uso da API está sujeito a termos e condições adicionais da Meta. Consulte a [documentação oficial](https://developers.facebook.com/docs/whatsapp/overview).

🔒 **Segurança**: Nunca commite tokens de acesso ou credenciais no repositório. Use variáveis de ambiente.

📊 **Rate Limits**: A API possui limites de taxa. Consulte a documentação para detalhes sobre limites e melhores práticas.

## Suporte

Para questões sobre a API:
- [Comunidade de Desenvolvedores do Facebook](https://developers.facebook.com/community/)
- [Stack Overflow - Tag: whatsapp-business-api](https://stackoverflow.com/questions/tagged/whatsapp-business-api)
- [GitHub Issues - Facebook OpenAPI](https://github.com/facebook/openapi/issues)

## Licença

A especificação OpenAPI é licenciada sob MIT pela Meta. Veja o arquivo `LICENSE` para mais detalhes.


import { NextRequest, NextResponse } from 'next/server';
import https from 'https';
import { getApplePayCredentials, sanitizeAppleValidationURL } from '@/lib/apple-pay-config';

export const runtime = 'nodejs';

// Validar merchant com Apple Pay
export async function POST(request: NextRequest) {
  try {
    const { validationURL, merchantId } = await request.json();

    if (!validationURL || !merchantId) {
      return NextResponse.json({
        error: 'ValidationURL e merchantId são obrigatórios'
      }, { status: 400 });
    }

    console.log('🔐 Validando merchant Apple Pay:', { validationURL, merchantId });

    const url = sanitizeAppleValidationURL(validationURL);
    const credentials = getApplePayCredentials(merchantId);

    const validationData = {
      merchantIdentifier: credentials.merchantIdentifier,
      domainName: credentials.domainName,
      displayName: credentials.displayName
    };

    const merchantSession = await validateWithApple(url, validationData, {
      cert: credentials.certificate,
      key: credentials.privateKey
    });

    console.log('✅ Merchant validado com sucesso');

    return NextResponse.json(merchantSession);

  } catch (error: any) {
    console.error('❌ Erro na validação do merchant:', error);

    return NextResponse.json({
      error: 'Falha na validação do merchant',
      details: error.message,
      responseBody: error.responseBody
    }, { status: error.statusCode || 500 });
  }
}

// Função para validar com Apple Pay servers
async function validateWithApple(
  url: URL,
  data: { merchantIdentifier: string; domainName: string; displayName: string },
  certificates: { cert: Buffer; key: Buffer }
): Promise<any> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const pathWithQuery = `${url.pathname}${url.search}`;
    const options = {
      hostname: url.hostname,
      port: url.port ? Number(url.port) : 443,
      path: pathWithQuery,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      cert: certificates.cert,
      key: certificates.key,
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        const contentType = res.headers['content-type'] || '';
        const responseBody = responseData.trim();
        const isJSON = contentType.includes('application/json');

        if (res.statusCode === 200) {
          if (!responseBody) {
            reject(assignError(new Error('Resposta vazia do Apple Pay'), res.statusCode, responseBody));
            return;
          }

          if (!isJSON) {
            reject(assignError(new Error('Apple Pay retornou conteúdo não JSON'), res.statusCode, responseBody));
            return;
          }

          try {
            const merchantSession = JSON.parse(responseBody);
            resolve(merchantSession);
          } catch (error) {
            reject(assignError(new Error(`Falha ao interpretar resposta Apple Pay: ${error}`), res.statusCode, responseBody));
          }
          return;
        }

        const message = `Apple Pay retornou status ${res.statusCode} (${contentType || 'sem content-type'})`;
        reject(assignError(new Error(message), res.statusCode, responseBody));
      });
    });

    req.on('error', (error) => {
      reject(assignError(new Error(`Request to Apple Pay failed: ${error.message}`), undefined));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(assignError(new Error('Request to Apple Pay timed out'), undefined));
    });

    req.write(postData);
    req.end();
  });
}

function assignError<T extends Error>(error: T, statusCode?: number, responseBody?: string) {
  return Object.assign(error, {
    statusCode,
    responseBody: responseBody ? responseBody.slice(0, 500) : undefined
  });
}

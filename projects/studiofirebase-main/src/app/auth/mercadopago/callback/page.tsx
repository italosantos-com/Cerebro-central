/**
 * Página de callback OAuth do Mercado Pago
 * Processa o código de autorização e fecha o popup enviando mensagem para o opener
 */

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { mercadoPagoOAuth } from '@/services/mercadopago-oauth-integration';

export default function MercadoPagoCallbackPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processando autenticação...');

  useEffect(() => {
    const processCallback = async () => {
      try {
        const code = searchParams?.get?.('code');
        const state = searchParams?.get?.('state');
        const error = searchParams?.get?.('error');
        const errorDescription = searchParams?.get?.('error_description');

        // Verificar se houve erro
        if (error) {
          setStatus('error');
          setMessage(errorDescription || `Erro: ${error}`);
          
          // Enviar mensagem de erro para o opener
          if (window.opener) {
            window.opener.postMessage({
              success: false,
              error,
              message: errorDescription || 'Autenticação cancelada ou falhou',
              platform: 'mercadopago',
            }, window.location.origin);
          }
          
          // Fechar popup após 3 segundos
          setTimeout(() => {
            window.close();
          }, 3000);
          return;
        }

        // Verificar se temos o código
        if (!code) {
          setStatus('error');
          setMessage('Código de autorização não encontrado. Abra esta URL apenas após clicar em “Conectar Mercado Pago” no painel admin.');
          
          if (window.opener) {
            window.opener.postMessage({
              success: false,
              error: 'no_code',
              message: 'Código de autorização não encontrado',
              platform: 'mercadopago',
            }, window.location.origin);
          }
          
          setTimeout(() => {
            window.close();
          }, 3000);
          return;
        }

        // Trocar código por token
        setMessage('Obtendo Access Token...');
        const result = await mercadoPagoOAuth.exchangeCodeForToken(code, state || undefined, true);

        if (result.success) {
          setStatus('success');
          setMessage('Autenticação realizada com sucesso!');

          // Enviar dados para o opener
          if (window.opener) {
            window.opener.postMessage({
              success: true,
              accessToken: result.accessToken,
              refreshToken: result.refreshToken,
              publicKey: result.publicKey,
              userId: result.userId,
              user: result.user,
              expiresIn: result.expiresIn,
              platform: 'mercadopago',
            }, window.location.origin);
          }

          // Fechar popup após 2 segundos
          setTimeout(() => {
            window.close();
          }, 2000);
        } else {
          setStatus('error');
          setMessage(result.message || 'Falha ao obter Access Token');

          if (window.opener) {
            window.opener.postMessage({
              success: false,
              error: result.error,
              message: result.message,
              platform: 'mercadopago',
            }, window.location.origin);
          }

          setTimeout(() => {
            window.close();
          }, 3000);
        }
      } catch (error) {
        console.error('[MercadoPago Callback] Erro:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Erro desconhecido');

        if (window.opener) {
          window.opener.postMessage({
            success: false,
            error: 'exception',
            message: error instanceof Error ? error.message : 'Erro desconhecido',
            platform: 'mercadopago',
          }, window.location.origin);
        }

        setTimeout(() => {
          window.close();
        }, 3000);
      }
    };

    processCallback();
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-xl">
        <div className="flex flex-col items-center text-center">
          {status === 'processing' && (
            <>
              <Loader2 className="mb-4 h-16 w-16 animate-spin text-blue-600" />
              <h1 className="mb-2 text-2xl font-bold text-gray-900">Autenticando...</h1>
              <p className="text-gray-600">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="mb-4 h-16 w-16 text-green-600" />
              <h1 className="mb-2 text-2xl font-bold text-gray-900">Sucesso!</h1>
              <p className="text-gray-600">{message}</p>
              <p className="mt-4 text-sm text-gray-500">Esta janela será fechada automaticamente...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="mb-4 h-16 w-16 text-red-600" />
              <h1 className="mb-2 text-2xl font-bold text-gray-900">Erro</h1>
              <p className="text-gray-600">{message}</p>
              <p className="mt-4 text-sm text-gray-500">Esta janela será fechada automaticamente...</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

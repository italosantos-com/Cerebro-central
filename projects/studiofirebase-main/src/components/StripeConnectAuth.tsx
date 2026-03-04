'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface StripeAuthStatus {
  isAuthenticated: boolean;
  stripeUserId: string | null;
}

export default function StripeConnectAuth() {
  const [authStatus, setAuthStatus] = useState<StripeAuthStatus>({
    isAuthenticated: false,
    stripeUserId: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stripe/status');
      const data = await response.json();
      setAuthStatus(data);
    } catch (err: unknown) {
      console.error('Erro ao verificar status de autenticação:', err);
      setError('Erro ao verificar autenticação');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    window.location.href = '/api/stripe/auth';
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stripe/logout', {
        method: 'POST'
      });

      if (response.ok) {
        setAuthStatus({ isAuthenticated: false, stripeUserId: null });
        router.refresh();
      } else {
        setError('Erro ao fazer logout');
      }
    } catch (err: unknown) {
      console.error('Erro ao fazer logout:', err);
      setError('Erro ao fazer logout');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDashboard = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stripe/login-link', {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        window.open(data.url, '_blank');
      } else {
        setError('Erro ao abrir dashboard');
      }
    } catch (err: unknown) {
      console.error('Erro ao abrir dashboard:', err);
      setError('Erro ao abrir dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !authStatus.isAuthenticated) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          Stripe Connect
        </h2>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {!authStatus.isAuthenticated ? (
          <div className="space-y-4">
            <p className="text-gray-600 mb-4">
              Conecte sua conta Stripe para começar a aceitar pagamentos e gerenciar suas transações.
            </p>
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Conectando...
                </span>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z" />
                  </svg>
                  Conectar com Stripe
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-green-700 font-medium">
                  Conta conectada com sucesso
                </span>
              </div>
              {authStatus.stripeUserId && (
                <p className="text-sm text-green-600 mt-2 ml-7">
                  ID: {authStatus.stripeUserId}
                </p>
              )}
            </div>

            <button
              onClick={handleOpenDashboard}
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Abrindo...
                </span>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Abrir Dashboard Stripe
                </>
              )}
            </button>

            <button
              onClick={handleLogout}
              disabled={loading}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Desconectar
            </button>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Ao conectar sua conta Stripe, você poderá gerenciar pagamentos, visualizar transações e acessar relatórios detalhados através do dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}

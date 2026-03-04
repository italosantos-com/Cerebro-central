"use client";

import React, { useState } from 'react';
import ApplePayCheckout from '@/components/payments/ApplePayCheckout';
import useApplePay from '@/hooks/useApplePay';

const ApplePayDemoPage = () => {
  const [selectedProducts, setSelectedProducts] = useState([
    {
      id: '1',
      name: 'Produto Premium',
      price: 29.99,
      description: 'Acesso premium ao conteúdo exclusivo'
    },
    {
      id: '2', 
      name: 'Curso Online',
      price: 149.99,
      description: 'Curso completo de desenvolvimento'
    }
  ]);

  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Hook do Apple Pay
  const {
    isAvailable,
    isLoading,
    canMakePayments,
    error: applePayError,
    initiatePayment
  } = useApplePay({
    merchantId: process.env.NEXT_PUBLIC_APPLE_PAY_MERCHANT_ID || 'merchant.com.italosantos.payments',
    currency: 'USD',
    countryCode: 'US'
  });

  const handlePaymentSuccess = (txnId: string) => {
    console.log('✅ Pagamento realizado com sucesso:', txnId);
    setPaymentStatus('success');
    setTransactionId(txnId);
    setErrorMessage(null);
    
    // Aqui você pode redirecionar para página de sucesso, enviar email, etc.
    setTimeout(() => {
      // Simular redirecionamento
      console.log('Redirecionando para página de sucesso...');
    }, 2000);
  };

  const handlePaymentError = (error: any) => {
    console.error('❌ Erro no pagamento:', error);
    setPaymentStatus('error');
    setErrorMessage(error.message || 'Erro desconhecido no pagamento');
    setTransactionId(null);
  };

  const handleDirectApplePayClick = async () => {
    if (!isAvailable) return;

    setPaymentStatus('processing');
    
    try {
      const total = selectedProducts.reduce((sum, product) => sum + product.price, 0);
      
      const result = await initiatePayment(total.toFixed(2), {
        displayItems: selectedProducts.map(product => ({
          label: product.name,
          amount: product.price.toFixed(2),
          type: 'final' as const
        })),
        requestShipping: true,
        requestBilling: true,
        shippingOptions: [
          {
            id: 'standard',
            label: 'Frete Padrão',
            amount: '5.99',
            detail: '5-7 dias úteis',
            selected: true
          },
          {
            id: 'express',
            label: 'Frete Expresso', 
            amount: '12.99',
            detail: '2-3 dias úteis'
          }
        ]
      });

      if (result.success) {
        handlePaymentSuccess(result.transactionId);
      }

    } catch (error: any) {
      handlePaymentError(error);
    }
  };

  const resetDemo = () => {
    setPaymentStatus('idle');
    setTransactionId(null);
    setErrorMessage(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Verificando disponibilidade do Apple Pay...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">
          🍎 Apple Pay Integration Demo
        </h1>

        {/* Status do Apple Pay */}
        <div className="bg-white rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Status do Apple Pay</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded ${isAvailable ? 'bg-green-100' : 'bg-red-100'}`}>
              <h3 className="font-medium">Disponibilidade</h3>
              <p className={`${isAvailable ? 'text-green-700' : 'text-red-700'}`}>
                {isAvailable ? '✅ Disponível' : '❌ Não disponível'}
              </p>
            </div>
            <div className={`p-4 rounded ${canMakePayments ? 'bg-green-100' : 'bg-yellow-100'}`}>
              <h3 className="font-medium">Pode fazer pagamentos</h3>
              <p className={`${canMakePayments ? 'text-green-700' : 'text-yellow-700'}`}>
                {canMakePayments ? '✅ Sim' : '⚠️ Não configurado'}
              </p>
            </div>
            <div className={`p-4 rounded ${!applePayError ? 'bg-green-100' : 'bg-red-100'}`}>
              <h3 className="font-medium">Erros</h3>
              <p className={`${!applePayError ? 'text-green-700' : 'text-red-700'}`}>
                {!applePayError ? '✅ Nenhum erro' : `❌ ${applePayError}`}
              </p>
            </div>
          </div>
        </div>

        {/* Status do pagamento */}
        {paymentStatus !== 'idle' && (
          <div className={`p-4 rounded-lg mb-6 ${
            paymentStatus === 'success' ? 'bg-green-100 border border-green-400' :
            paymentStatus === 'error' ? 'bg-red-100 border border-red-400' :
            'bg-blue-100 border border-blue-400'
          }`}>
            {paymentStatus === 'processing' && (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-3"></div>
                <span className="text-blue-700">Processando pagamento...</span>
              </div>
            )}
            
            {paymentStatus === 'success' && (
              <div className="text-green-700">
                <h3 className="font-semibold">✅ Pagamento realizado com sucesso!</h3>
                <p>Transaction ID: {transactionId}</p>
                <button 
                  onClick={resetDemo}
                  className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Fazer outro pagamento
                </button>
              </div>
            )}
            
            {paymentStatus === 'error' && (
              <div className="text-red-700">
                <h3 className="font-semibold">❌ Erro no pagamento</h3>
                <p>{errorMessage}</p>
                <button 
                  onClick={resetDemo}
                  className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Tentar novamente
                </button>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Checkout Component */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Checkout Completo</h2>
            <ApplePayCheckout
              products={selectedProducts}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={handlePaymentError}
              merchantId={process.env.NEXT_PUBLIC_APPLE_PAY_MERCHANT_ID || 'merchant.com.italosantos.payments'}
              currency="USD"
              countryCode="US"
              includeShipping={true}
            />
          </div>

          {/* Direct Apple Pay Button */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Pagamento Direto</h2>
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="font-semibold mb-4">Usando o Hook useApplePay</h3>
              
              <div className="mb-4">
                <h4 className="font-medium mb-2">Produtos Selecionados:</h4>
                {selectedProducts.map(product => (
                  <div key={product.id} className="flex justify-between py-1">
                    <span className="text-sm">{product.name}</span>
                    <span className="text-sm font-medium">${product.price.toFixed(2)}</span>
                  </div>
                ))}
                <hr className="my-2" />
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>${selectedProducts.reduce((sum, p) => sum + p.price, 0).toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handleDirectApplePayClick}
                disabled={!isAvailable || paymentStatus === 'processing'}
                className={`w-full h-12 rounded-lg font-medium ${
                  isAvailable && paymentStatus !== 'processing'
                    ? 'bg-black text-white hover:bg-gray-800'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                style={{
                  background: isAvailable ? '#000' : '#ccc',
                  color: isAvailable ? '#fff' : '#666'
                }}
              >
                {paymentStatus === 'processing' ? 'Processando...' : '🍎 Pay'}
              </button>

              <p className="text-xs text-gray-500 text-center mt-2">
                Implementação usando hook personalizado
              </p>
            </div>
          </div>
        </div>

        {/* Informações técnicas */}
        <div className="mt-8 bg-white rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Informações Técnicas</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2">Configuração</h3>
              <ul className="text-sm space-y-1">
                <li>• Merchant ID: {process.env.NEXT_PUBLIC_APPLE_PAY_MERCHANT_ID || 'Não configurado'}</li>
                <li>• Moeda: USD</li>
                <li>• País: US</li>
                <li>• Redes suportadas: Visa, MasterCard, Amex, Discover</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Recursos Implementados</h3>
              <ul className="text-sm space-y-1">
                <li>✅ Validação de merchant</li>
                <li>✅ Processamento de pagamento</li>
                <li>✅ Suporte a frete</li>
                <li>✅ Cupons de desconto</li>
                <li>✅ Tratamento de erros</li>
                <li>✅ Hook personalizado</li>
              </ul>
            </div>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 rounded">
            <h4 className="font-medium text-yellow-800 mb-2">📝 Para usar em produção:</h4>
            <ol className="text-sm text-yellow-700 space-y-1">
              <li>1. Configure seu Merchant ID no Apple Developer Account</li>
              <li>2. Adicione e verifique seu domínio</li>
              <li>3. Baixe os certificados de merchant</li>
              <li>4. Configure as variáveis de ambiente</li>
              <li>5. Integre com seu gateway de pagamento</li>
              <li>6. Teste em dispositivos iOS reais</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplePayDemoPage;

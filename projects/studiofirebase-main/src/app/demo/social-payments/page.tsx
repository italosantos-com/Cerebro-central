"use client";

import React, { useState } from 'react';
import PayPalPayment from '@/components/payments/PayPalPayment';
import MercadoPagoPayment from '@/components/payments/MercadoPagoPayment';
import ApplePayCheckout from '@/components/payments/ApplePayCheckout';
import FacebookPixel, { useFacebookPixel } from '@/components/social/FacebookPixel';
import TwitterWidget, { 
  TwitterTimeline, 
  TwitterFollowButton, 
  TwitterTweet 
} from '@/components/social/TwitterWidget';
import InstagramEmbed, { useInstagramAPI } from '@/components/social/InstagramEmbed';

const SocialPaymentsDemoPage = () => {
  const [selectedPayment, setSelectedPayment] = useState<'apple' | 'paypal' | 'mercadopago'>('paypal');
  const [paymentAmount, setPaymentAmount] = useState(99.99);
  const [paymentStatus, setPaymentStatus] = useState<string>('');

  // Hooks para integração
  const facebookPixel = useFacebookPixel();
  const instagramAPI = useInstagramAPI();

  // Produtos de exemplo
  const products = [
    {
      id: '1',
      name: 'Curso Premium',
      price: 99.99,
      description: 'Acesso completo ao curso premium'
    }
  ];

  const handlePaymentSuccess = (details: any) => {
    console.log('✅ Pagamento realizado:', details);
    setPaymentStatus('Pagamento realizado com sucesso!');
    
    // Rastrear conversão no Facebook
    facebookPixel.trackPurchase(paymentAmount, 'USD');
    facebookPixel.trackCustomEvent('PurchaseCompleted', {
      payment_method: selectedPayment,
      amount: paymentAmount
    });
  };

  const handlePaymentError = (error: any) => {
    console.error('❌ Erro no pagamento:', error);
    setPaymentStatus(`Erro no pagamento: ${error.message || 'Erro desconhecido'}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Facebook Pixel */}
      <FacebookPixel />
      
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-8">
          🌟 Demo: Integrações Sociais & Pagamentos
        </h1>

        {/* Status do pagamento */}
        {paymentStatus && (
          <div className={`p-4 rounded-lg mb-6 ${
            paymentStatus.includes('sucesso') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {paymentStatus}
            <button 
              onClick={() => setPaymentStatus('')}
              className="ml-4 text-sm underline"
            >
              Fechar
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Seção de Pagamentos */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">💳 Métodos de Pagamento</h2>
            
            {/* Controles */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="font-semibold mb-4">Configurações</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Valor:</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Método:</label>
                <select
                  value={selectedPayment}
                  onChange={(e) => setSelectedPayment(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="paypal">PayPal</option>
                  <option value="mercadopago">MercadoPago</option>
                  <option value="apple">Apple Pay</option>
                </select>
              </div>
            </div>

            {/* PayPal */}
            {selectedPayment === 'paypal' && (
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="font-semibold mb-4">💙 PayPal Payment</h3>
                <PayPalPayment
                  amount={paymentAmount.toString()}
                  currency="USD"
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
              </div>
            )}

            {/* MercadoPago */}
            {selectedPayment === 'mercadopago' && (
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="font-semibold mb-4">💳 MercadoPago</h3>
                <MercadoPagoPayment
                  amount={paymentAmount}
                  currency="BRL"
                  description="Curso Premium"
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
              </div>
            )}

            {/* Apple Pay */}
            {selectedPayment === 'apple' && (
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="font-semibold mb-4">🍎 Apple Pay</h3>
                <ApplePayCheckout
                  products={products}
                  onPaymentSuccess={handlePaymentSuccess}
                  onPaymentError={handlePaymentError}
                  merchantId={process.env.NEXT_PUBLIC_APPLE_PAY_MERCHANT_ID || 'merchant.com.italosantos'}
                  currency="USD"
                  countryCode="US"
                />
              </div>
            )}

            {/* Facebook Pixel Actions */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="font-semibold mb-4">📘 Facebook Pixel Events</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => facebookPixel.trackViewContent('Demo Page')}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  View Content
                </button>
                <button
                  onClick={() => facebookPixel.trackAddToCart('Curso Premium', paymentAmount)}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Add to Cart
                </button>
                <button
                  onClick={() => facebookPixel.trackLead('Demo Lead')}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  Lead
                </button>
                <button
                  onClick={() => facebookPixel.trackSearch('curso premium')}
                  className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                >
                  Search
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Eventos são enviados para o Facebook Analytics
              </p>
            </div>
          </div>

          {/* Seção Social */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">🌐 Integrações Sociais</h2>

            {/* Twitter */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="font-semibold mb-4">🐦 Twitter</h3>
              
              {/* Follow Button */}
              <div className="mb-4">
                <TwitterFollowButton 
                  screenName="italosantos"
                  size="medium"
                  showCount={true}
                />
              </div>

              {/* Timeline */}
              <TwitterTimeline 
                screenName="italosantos"
                width={350}
                height={300}
                theme="light"
                tweetLimit={3}
              />
            </div>

            {/* Instagram */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="font-semibold mb-4">📸 Instagram</h3>
              
              {/* API Status */}
              <div className="mb-4 p-3 bg-gray-100 rounded">
                <p className="text-sm">
                  Status: {instagramAPI.isAuthenticated ? '✅ Conectado' : '❌ Não conectado'}
                </p>
                {!instagramAPI.isAuthenticated && (
                  <button
                    onClick={instagramAPI.authenticateUser}
                    className="mt-2 px-4 py-2 bg-pink-600 text-white rounded hover:bg-pink-700"
                  >
                    Conectar Instagram
                  </button>
                )}
              </div>

              {/* Embed Example */}
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Exemplo de post embed:</p>
                <InstagramEmbed
                  url="https://www.instagram.com/p/exemplo/"
                  width={350}
                  caption={true}
                />
              </div>
            </div>

            {/* Configuração */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="font-semibold mb-4">⚙️ Configuração</h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <strong>PayPal:</strong>
                  <span className={`ml-2 ${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ? 'text-green-600' : 'text-red-600'}`}>
                    {process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ? '✅ Configurado' : '❌ Não configurado'}
                  </span>
                </div>
                
                <div>
                  <strong>MercadoPago:</strong>
                  <span className={`ml-2 ${process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ? 'text-green-600' : 'text-red-600'}`}>
                    {process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ? '✅ Configurado' : '❌ Não configurado'}
                  </span>
                </div>
                
                <div>
                  <strong>Apple Pay:</strong>
                  <span className={`ml-2 ${process.env.NEXT_PUBLIC_APPLE_PAY_MERCHANT_ID ? 'text-green-600' : 'text-red-600'}`}>
                    {process.env.NEXT_PUBLIC_APPLE_PAY_MERCHANT_ID ? '✅ Configurado' : '❌ Não configurado'}
                  </span>
                </div>
                
                <div>
                  <strong>Facebook Pixel:</strong>
                  <span className={`ml-2 ${process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID ? 'text-green-600' : 'text-red-600'}`}>
                    {process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID ? '✅ Configurado' : '❌ Não configurado'}
                  </span>
                </div>
                
                <div>
                  <strong>Instagram API:</strong>
                  <span className={`ml-2 ${process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID ? 'text-green-600' : 'text-red-600'}`}>
                    {process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID ? '✅ Configurado' : '❌ Não configurado'}
                  </span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-yellow-50 rounded">
                <p className="text-xs text-yellow-700">
                  💡 Configure as variáveis de ambiente em .env.local para ativar todas as funcionalidades
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Instruções */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow-lg">
          <h3 className="font-semibold mb-4">📋 Instruções de Configuração</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
            <div>
              <h4 className="font-medium mb-2">PayPal</h4>
              <ol className="space-y-1 text-gray-600">
                <li>1. Criar conta no PayPal Developer</li>
                <li>2. Criar aplicação</li>
                <li>3. Adicionar NEXT_PUBLIC_PAYPAL_CLIENT_ID</li>
                <li>4. Adicionar PAYPAL_CLIENT_SECRET</li>
              </ol>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">MercadoPago</h4>
              <ol className="space-y-1 text-gray-600">
                <li>1. Criar conta no MercadoPago</li>
                <li>2. Acessar painel de desenvolvedores</li>
                <li>3. Adicionar NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY</li>
                <li>4. Adicionar MERCADOPAGO_ACCESS_TOKEN</li>
              </ol>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Apple Pay</h4>
              <ol className="space-y-1 text-gray-600">
                <li>1. Conta Apple Developer</li>
                <li>2. Configurar Merchant ID</li>
                <li>3. Verificar domínio</li>
                <li>4. Baixar certificados</li>
              </ol>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Facebook</h4>
              <ol className="space-y-1 text-gray-600">
                <li>1. Criar app no Facebook</li>
                <li>2. Configurar Pixel</li>
                <li>3. Adicionar NEXT_PUBLIC_FACEBOOK_PIXEL_ID</li>
                <li>4. Verificar domínio</li>
              </ol>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Instagram</h4>
              <ol className="space-y-1 text-gray-600">
                <li>1. App Facebook conectado</li>
                <li>2. Instagram Basic Display API</li>
                <li>3. Adicionar NEXT_PUBLIC_INSTAGRAM_CLIENT_ID</li>
                <li>4. Configurar redirect URIs</li>
              </ol>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Twitter</h4>
              <ol className="space-y-1 text-gray-600">
                <li>1. Conta Twitter Developer</li>
                <li>2. Criar projeto</li>
                <li>3. Widgets automáticos</li>
                <li>4. Configurar API keys (opcional)</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialPaymentsDemoPage;

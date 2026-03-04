import React, { useState } from 'react';
import ApplePayButton from './ApplePayButton';

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  image?: string;
}

interface ApplePayCheckoutProps {
  products: Product[];
  onPaymentSuccess?: (transactionId: string) => void;
  onPaymentError?: (error: any) => void;
  merchantId: string;
  currency?: string;
  countryCode?: string;
  includeShipping?: boolean;
}

const ApplePayCheckout: React.FC<ApplePayCheckoutProps> = ({
  products = [],
  onPaymentSuccess,
  onPaymentError,
  merchantId,
  currency = 'USD',
  countryCode = 'US',
  includeShipping = false
}) => {
  const [selectedShipping, setSelectedShipping] = useState('standard');
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);

  // Calcular totais
  const subtotal = products.reduce((sum, product) => sum + product.price, 0);
  const tax = subtotal * 0.08; // 8% tax
  const shippingCost = includeShipping ? getShippingCost(selectedShipping) : 0;
  const total = subtotal + tax + shippingCost - discount;

  // Opções de frete
  const shippingOptions = [
    {
      id: 'standard',
      label: 'Frete Padrão',
      amount: '5.99',
      detail: '5-7 dias úteis',
      selected: selectedShipping === 'standard'
    },
    {
      id: 'express',
      label: 'Frete Expresso',
      amount: '12.99',
      detail: '2-3 dias úteis',
      selected: selectedShipping === 'express'
    },
    {
      id: 'overnight',
      label: 'Entrega no Próximo Dia',
      amount: '24.99',
      detail: '1 dia útil',
      selected: selectedShipping === 'overnight'
    }
  ];

  // Itens para mostrar na tela de pagamento
  const displayItems = [
    ...products.map(product => ({
      label: product.name,
      amount: product.price.toFixed(2),
      type: 'final' as const
    })),
    {
      label: 'Subtotal',
      amount: subtotal.toFixed(2),
      type: 'final' as const
    },
    {
      label: 'Impostos',
      amount: tax.toFixed(2),
      type: 'final' as const
    }
  ];

  if (includeShipping && shippingCost > 0) {
    displayItems.push({
      label: 'Frete',
      amount: shippingCost.toFixed(2),
      type: 'final' as const
    });
  }

  if (discount > 0) {
    displayItems.push({
      label: 'Desconto',
      amount: `-${discount.toFixed(2)}`,
      type: 'final' as const
    });
  }

  function getShippingCost(option: string): number {
    const costs: { [key: string]: number } = {
      standard: 5.99,
      express: 12.99,
      overnight: 24.99
    };
    return costs[option] || 0;
  }

  const applyCoupon = () => {
    const coupons: { [key: string]: number } = {
      'SAVE20': subtotal * 0.2,
      'SAVE10': subtotal * 0.1,
      'FREESHIP': includeShipping ? shippingCost : 0,
      'FIRST5': 5.00
    };

    const couponDiscount = coupons[couponCode.toUpperCase()] || 0;
    setDiscount(couponDiscount);
  };

  const handlePaymentSuccess = (response: any) => {
    console.log('✅ Pagamento Apple Pay realizado com sucesso:', response);
    
    if (onPaymentSuccess && response.details) {
      // Extrair transaction ID da resposta
      const transactionId = response.details.transactionIdentifier || 
                          `ap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      onPaymentSuccess(transactionId);
    }
  };

  const handlePaymentError = (error: any) => {
    console.error('❌ Erro no pagamento Apple Pay:', error);
    
    if (onPaymentError) {
      onPaymentError(error);
    }
  };

  const handleMerchantValidation = async (event: any) => {
    // Custom merchant validation se necessário
    // Por padrão, o componente usa o endpoint /api/payments/apple-pay/validate-merchant
    return null;
  };

  if (products.length === 0) {
    return (
      <div className="apple-pay-checkout">
        <p>Nenhum produto selecionado para checkout.</p>
      </div>
    );
  }

  return (
    <div className="apple-pay-checkout bg-white p-6 rounded-lg shadow-lg max-w-md mx-auto">
      <h3 className="text-xl font-bold mb-4">Finalizar Compra</h3>
      
      {/* Resumo dos produtos */}
      <div className="products-summary mb-4">
        <h4 className="font-semibold mb-2">Produtos:</h4>
        {products.map(product => (
          <div key={product.id} className="flex justify-between py-1">
            <span className="text-sm">{product.name}</span>
            <span className="text-sm font-medium">${product.price.toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Cupom de desconto */}
      <div className="coupon-section mb-4 p-3 bg-gray-50 rounded">
        <label className="block text-sm font-medium mb-2">Cupom de Desconto:</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="Digite o código"
            className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
          />
          <button
            onClick={applyCoupon}
            className="px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            Aplicar
          </button>
        </div>
        {discount > 0 && (
          <p className="text-green-600 text-sm mt-1">
            Desconto aplicado: -${discount.toFixed(2)}
          </p>
        )}
      </div>

      {/* Opções de frete */}
      {includeShipping && (
        <div className="shipping-section mb-4 p-3 bg-gray-50 rounded">
          <label className="block text-sm font-medium mb-2">Opções de Frete:</label>
          {shippingOptions.map(option => (
            <label key={option.id} className="flex items-center mb-2 cursor-pointer">
              <input
                type="radio"
                name="shipping"
                value={option.id}
                checked={selectedShipping === option.id}
                onChange={(e) => setSelectedShipping(e.target.value)}
                className="mr-2"
              />
              <span className="flex-1 text-sm">
                {option.label} - {option.detail}
              </span>
              <span className="text-sm font-medium">${option.amount}</span>
            </label>
          ))}
        </div>
      )}

      {/* Resumo de valores */}
      <div className="order-summary mb-6 p-3 bg-gray-50 rounded">
        <div className="flex justify-between py-1">
          <span className="text-sm">Subtotal:</span>
          <span className="text-sm">${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-sm">Impostos:</span>
          <span className="text-sm">${tax.toFixed(2)}</span>
        </div>
        {includeShipping && shippingCost > 0 && (
          <div className="flex justify-between py-1">
            <span className="text-sm">Frete:</span>
            <span className="text-sm">${shippingCost.toFixed(2)}</span>
          </div>
        )}
        {discount > 0 && (
          <div className="flex justify-between py-1 text-green-600">
            <span className="text-sm">Desconto:</span>
            <span className="text-sm">-${discount.toFixed(2)}</span>
          </div>
        )}
        <hr className="my-2" />
        <div className="flex justify-between py-1 font-bold">
          <span>Total:</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      {/* Botão Apple Pay */}
      <div className="apple-pay-section">
        <ApplePayButton
          amount={total.toFixed(2)}
          currency={currency}
          countryCode={countryCode}
          merchantId={merchantId}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentError={handlePaymentError}
          onMerchantValidation={handleMerchantValidation}
          buttonStyle="black"
          buttonType="buy"
          className="w-full mb-3"
          requestShipping={includeShipping}
          requestBilling={true}
          displayItems={displayItems}
          shippingOptions={includeShipping ? shippingOptions : undefined}
        />
        
        <p className="text-xs text-gray-500 text-center">
          Ou escolha outra forma de pagamento
        </p>
      </div>

      {/* Informações de segurança */}
      <div className="security-info mt-4 p-3 bg-blue-50 rounded">
        <h5 className="text-sm font-semibold mb-1 text-blue-800">
          🔒 Pagamento Seguro
        </h5>
        <p className="text-xs text-blue-700">
          Seus dados de pagamento são criptografados e processados com segurança através do Apple Pay.
          Não armazenamos informações do seu cartão.
        </p>
      </div>

      {/* Debug info (apenas em desenvolvimento) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="debug-info mt-4 p-3 bg-yellow-50 rounded">
          <h5 className="text-sm font-semibold mb-1 text-yellow-800">
            🛠️ Debug Info
          </h5>
          <pre className="text-xs text-yellow-700 overflow-auto">
            {JSON.stringify({
              products: products.length,
              subtotal,
              tax,
              shipping: shippingCost,
              discount,
              total,
              currency,
              merchantId
            }, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ApplePayCheckout;

import React, { useState, useEffect } from 'react';

interface ApplePayMerchantValidationEvent extends Event {
  readonly validationURL: string;
  complete(merchantSession: any): void;
}

declare global {
  interface PaymentRequest {
    onmerchantvalidation: ((this: PaymentRequest, ev: ApplePayMerchantValidationEvent) => any) | null;
  }
}

// Tipos TypeScript para Apple Pay
interface ApplePayPaymentRequest {
  countryCode: string;
  currencyCode: string;
  supportedNetworks: string[];
  merchantCapabilities: string[];
  total: {
    label: string;
    amount: string;
  };
  displayItems?: Array<{
    label: string;
    amount: string;
    type?: 'pending' | 'final';
  }>;
  shippingOptions?: Array<{
    id: string;
    label: string;
    amount: string;
    detail: string;
    selected?: boolean;
  }>;
  requiredBillingContactFields?: string[];
  requiredShippingContactFields?: string[];
  recurringPaymentRequest?: {
    paymentDescription: string;
    regularBilling: {
      label: string;
      amount: string;
      paymentTiming: string;
    };
    managementURL: string;
  };
}

interface PaymentMethodData {
  supportedMethods: string;
  data: ApplePayPaymentRequest;
}

interface PaymentDetailsInit {
  total: {
    label: string;
    amount: {
      currency: string;
      value: string;
    };
  };
  displayItems?: Array<{
    label: string;
    amount: {
      currency: string;
      value: string;
    };
    type?: 'tax' | 'discount';
  }>;
  shippingOptions?: Array<{
    id: string;
    label: string;
    amount: {
      currency: string;
      value: string;
    };
    selected?: boolean;
  }>;
  modifiers?: Array<{
    supportedMethods: string;
    total?: {
      label: string;
      amount: {
        currency: string;
        value: string;
      };
    };
    additionalDisplayItems?: Array<{
      label: string;
      amount: {
        currency: string;
        value: string;
      };
    }>;
  }>;
}

interface PaymentOptions {
  requestPayerName?: boolean;
  requestPayerEmail?: boolean;
  requestPayerPhone?: boolean;
  requestShipping?: boolean;
  shippingType?: 'shipping' | 'delivery' | 'pickup';
}

interface ApplePayButtonProps {
  amount: string;
  currency?: string;
  countryCode?: string;
  merchantId: string;
  onPaymentSuccess?: (response: any) => void;
  onPaymentError?: (error: any) => void;
  onMerchantValidation?: (event: any) => Promise<any>;
  buttonStyle?: 'black' | 'white' | 'white-outline';
  buttonType?: 'plain' | 'buy' | 'pay' | 'order' | 'reload' | 'add-money' | 'top-up' | 'rent' | 'support' | 'contribute' | 'tip';
  className?: string;
  requestShipping?: boolean;
  requestBilling?: boolean;
  displayItems?: Array<{
    label: string;
    amount: string;
    type?: 'pending' | 'final';
  }>;
  shippingOptions?: Array<{
    id: string;
    label: string;
    amount: string;
    detail: string;
    selected?: boolean;
  }>;
  recurringPayment?: {
    description: string;
    amount: string;
    interval: 'month' | 'year';
    managementURL: string;
  };
}

const ApplePayButton: React.FC<ApplePayButtonProps> = ({
  amount,
  currency = 'USD',
  countryCode = 'US',
  merchantId,
  onPaymentSuccess,
  onPaymentError,
  onMerchantValidation,
  buttonStyle = 'black',
  buttonType = 'pay',
  className = '',
  requestShipping = false,
  requestBilling = false,
  displayItems = [],
  shippingOptions = [],
  recurringPayment
}) => {
  const [isApplePayAvailable, setIsApplePayAvailable] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Verificar se Apple Pay está disponível
    if (window.PaymentRequest) {
      const testMethod: PaymentMethodData = {
        supportedMethods: 'https://apple.com/apple-pay',
        data: {
          countryCode: countryCode,
          currencyCode: currency,
          supportedNetworks: ['visa', 'masterCard', 'amex', 'discover'],
          merchantCapabilities: ['supports3DS'],
          total: {
            label: 'Test',
            amount: '0.01'
          }
        }
      };

      const testDetails: PaymentDetailsInit = {
        total: {
          label: 'Test',
          amount: {
            currency: currency,
            value: '0.01'
          }
        }
      };

      try {
        const testRequest = new PaymentRequest([testMethod], testDetails);
        if (testRequest.canMakePayment) {
          testRequest.canMakePayment().then(result => {
            setIsApplePayAvailable(result);
          }).catch(() => {
            setIsApplePayAvailable(false);
          });
        }
      } catch (error) {
        console.warn('Apple Pay não disponível:', error);
        setIsApplePayAvailable(false);
      }
    }
  }, [currency, countryCode]);

  const createPaymentRequest = (): PaymentRequest | null => {
    if (!window.PaymentRequest) return null;

    // Configurar método de pagamento
    const method: PaymentMethodData = {
      supportedMethods: 'https://apple.com/apple-pay',
      data: {
        countryCode: countryCode,
        currencyCode: currency,
        supportedNetworks: ['visa', 'masterCard', 'amex', 'discover', 'maestro'],
        merchantCapabilities: ['supports3DS', 'supportsCredit', 'supportsDebit'],
        total: {
          label: 'Total',
          amount: amount
        },
        displayItems: displayItems.map(item => ({
          label: item.label,
          amount: item.amount,
          type: item.type || 'final'
        })),
        shippingOptions: shippingOptions,
        requiredBillingContactFields: requestBilling ? ['postalAddress'] : undefined,
        requiredShippingContactFields: requestShipping ? ['postalAddress', 'name', 'phone'] : undefined,
        recurringPaymentRequest: recurringPayment ? {
          paymentDescription: recurringPayment.description,
          regularBilling: {
            label: recurringPayment.description,
            amount: recurringPayment.amount,
            paymentTiming: recurringPayment.interval === 'month' ? 'monthly' : 'yearly'
          },
          managementURL: recurringPayment.managementURL
        } : undefined
      }
    };

    // Configurar detalhes do pagamento
    const details: PaymentDetailsInit = {
      total: {
        label: 'Total',
        amount: {
          currency: currency,
          value: amount
        }
      },
      displayItems: displayItems.map(item => ({
        label: item.label,
        amount: {
          currency: currency,
          value: item.amount
        },
        type: item.type === 'pending' ? undefined : 'tax'
      })),
      shippingOptions: shippingOptions.map(option => ({
        id: option.id,
        label: option.label,
        amount: {
          currency: currency,
          value: option.amount
        },
        selected: option.selected || false
      })),
      modifiers: [
        {
          supportedMethods: 'https://apple.com/apple-pay',
          total: {
            label: 'Total com Apple Pay',
            amount: {
              currency: currency,
              value: amount
            }
          },
          additionalDisplayItems: [
            {
              label: 'Desconto Apple Pay',
              amount: {
                currency: currency,
                value: '-0.50'
              }
            }
          ]
        }
      ]
    };

    // Configurar opções
    const options: PaymentOptions = {
      requestPayerName: true,
      requestPayerEmail: true,
      requestPayerPhone: requestShipping,
      requestShipping: requestShipping,
      shippingType: requestShipping ? 'shipping' : undefined
    };

    return new PaymentRequest([method], details, options);
  };

  const handleApplePayClick = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);

    try {
      const request = createPaymentRequest();
      if (!request) {
        throw new Error('PaymentRequest não disponível');
      }

      // Handler para validação do merchant
      request.onmerchantvalidation = async (event) => {
        console.log('🔐 Validando merchant...', event.validationURL);
        
        try {
          let merchantSession;
          
          if (onMerchantValidation) {
            merchantSession = await onMerchantValidation(event);
          } else {
            // Implementação padrão - chamar seu endpoint
            const response = await fetch('/api/payments/apple-pay/validate-merchant', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                validationURL: event.validationURL,
                merchantId: merchantId
              }),
            });

            if (!response.ok) {
              throw new Error('Falha na validação do merchant');
            }

            merchantSession = await response.json();
          }

          event.complete(merchantSession);
        } catch (error) {
          console.error('❌ Erro na validação do merchant:', error);
          event.complete(Promise.reject(error));
        }
      };

      // Handler para mudança de endereço de entrega
      if (requestShipping) {
        request.onshippingaddresschange = async (event: any) => {
          console.log('📍 Endereço de entrega alterado:', event.target?.shippingAddress);
          
          // Aqui você pode recalcular taxas, frete, etc.
          const updatedDetails = {
            total: {
              label: 'Total',
              amount: {
                currency: currency,
                value: amount
              }
            },
            displayItems: displayItems.map(item => ({
              label: item.label,
              amount: {
                currency: currency,
                value: item.amount
              }
            }))
          };

          event.updateWith(Promise.resolve(updatedDetails));
        };

        request.onshippingoptionchange = async (event: any) => {
          console.log('🚚 Opção de entrega alterada:', event.target?.shippingOption);
          
          const selectedShipping = shippingOptions.find(option => option.id === event.target?.shippingOption);
          const shippingCost = selectedShipping ? parseFloat(selectedShipping.amount) : 0;
          const newTotal = (parseFloat(amount) + shippingCost).toFixed(2);

          const updatedDetails = {
            total: {
              label: 'Total',
              amount: {
                currency: currency,
                value: newTotal
              }
            },
            displayItems: [
              ...displayItems.map(item => ({
                label: item.label,
                amount: {
                  currency: currency,
                  value: item.amount
                }
              })),
              {
                label: 'Frete',
                amount: {
                  currency: currency,
                  value: shippingCost.toFixed(2)
                }
              }
            ]
          };

          event.updateWith(Promise.resolve(updatedDetails));
        };
      }

      // Mostrar a sheet de pagamento
      console.log('💳 Mostrando Apple Pay...');
      const paymentResponse = await request.show();

      console.log('✅ Pagamento autorizado:', paymentResponse);

      // Processar o pagamento
      await processPayment(paymentResponse);

      // Completar o pagamento
      await paymentResponse.complete('success');
      
      if (onPaymentSuccess) {
        onPaymentSuccess(paymentResponse);
      }

    } catch (error) {
      console.error('❌ Erro no Apple Pay:', error);
      
      if (onPaymentError) {
        onPaymentError(error);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const processPayment = async (paymentResponse: any): Promise<void> => {
    // Enviar o token de pagamento para seu servidor
    const response = await fetch('/api/payments/apple-pay/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentData: paymentResponse.details,
        billingContact: paymentResponse.payerName ? {
          name: paymentResponse.payerName,
          email: paymentResponse.payerEmail,
          phone: paymentResponse.payerPhone
        } : undefined,
        shippingContact: paymentResponse.shippingAddress,
        amount: amount,
        currency: currency
      }),
    });

    if (!response.ok) {
      throw new Error('Falha no processamento do pagamento');
    }

    const result = await response.json();
    console.log('💰 Pagamento processado:', result);
  };

  if (!isApplePayAvailable) {
    return null; // Não mostrar o botão se Apple Pay não estiver disponível
  }

  return (
    <button
      type="button"
      className={`apple-pay-button apple-pay-button-${buttonStyle} apple-pay-button-type-${buttonType} w-full min-w-[200px] ${className}`}
      onClick={handleApplePayClick}
      disabled={isProcessing}
      style={{
        display: 'inline-block',
        WebkitAppearance: '-apple-pay-button' as any,
        appearance: '-apple-pay-button' as any,
        height: '48px',
        borderRadius: '6px',
        padding: '0px',
        boxSizing: 'border-box',
        border: '0px',
        outline: 'none',
        background: buttonStyle === 'black' ? '#000' : buttonStyle === 'white' ? '#fff' : 'transparent',
        cursor: isProcessing ? 'not-allowed' : 'pointer',
        opacity: isProcessing ? 0.6 : 1
      }}
      aria-label={isProcessing ? 'Processando pagamento...' : 'Pagar com Apple Pay'}
    >
      {isProcessing && (
        <span style={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          color: buttonStyle === 'black' ? '#fff' : '#000',
          fontSize: '14px'
        }}>
          Processando...
        </span>
      )}
    </button>
  );
};

export default ApplePayButton;

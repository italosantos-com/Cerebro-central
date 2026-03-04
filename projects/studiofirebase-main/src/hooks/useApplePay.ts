import { useState, useEffect, useCallback } from 'react';

interface UseApplePayOptions {
  merchantId: string;
  currency?: string;
  countryCode?: string;
  supportedNetworks?: string[];
  merchantCapabilities?: string[];
}

interface UseApplePayReturn {
  isAvailable: boolean;
  isLoading: boolean;
  canMakePayments: boolean;
  error: string | null;
  initiatePayment: (amount: string, options?: ApplePayPaymentOptions) => Promise<any>;
  validateMerchant: (validationURL: string) => Promise<any>;
}

interface ApplePayPaymentOptions {
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
  requestShipping?: boolean;
  requestBilling?: boolean;
  requestPayerName?: boolean;
  requestPayerEmail?: boolean;
  requestPayerPhone?: boolean;
  applicationData?: string;
  requiredShippingContactFields?: string[];
  requiredBillingContactFields?: string[];
}

const useApplePay = (options: UseApplePayOptions): UseApplePayReturn => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [canMakePayments, setCanMakePayments] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    merchantId,
    currency = 'USD',
    countryCode = 'US',
    supportedNetworks = ['visa', 'masterCard', 'amex', 'discover'],
    merchantCapabilities = ['supports3DS', 'supportsCredit', 'supportsDebit']
  } = options;

  // Verificar disponibilidade do Apple Pay
  useEffect(() => {
    checkApplePayAvailability();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantId, currency, countryCode]); // checkApplePayAvailability é definida abaixo

  const checkApplePayAvailability = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Verificar se PaymentRequest API está disponível
      if (!window.PaymentRequest) {
        throw new Error('Payment Request API não suportada neste navegador');
      }

      // Verificar se Apple Pay está disponível
      const method = {
        supportedMethods: 'https://apple.com/apple-pay',
        data: {
          countryCode,
          currencyCode: currency,
          supportedNetworks,
          merchantCapabilities,
          total: {
            label: 'Test',
            amount: '0.01'
          }
        }
      };

      const details = {
        total: {
          label: 'Test',
          amount: {
            currency,
            value: '0.01'
          }
        }
      };

      const request = new PaymentRequest([method], details);
      
      if (request.canMakePayment) {
        const canPay = await request.canMakePayment();
        setCanMakePayments(canPay);
        setIsAvailable(canPay);
      } else {
        setIsAvailable(true); // Assumir disponibilidade se não puder verificar
        setCanMakePayments(true);
      }

    } catch (err: any) {
      console.warn('Apple Pay não disponível:', err.message);
      setError(err.message);
      setIsAvailable(false);
      setCanMakePayments(false);
    } finally {
      setIsLoading(false);
    }
  };

  const validateMerchant = useCallback(async (validationURL: string): Promise<any> => {
    try {
      const response = await fetch('/api/payments/apple-pay/validate-merchant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          validationURL,
          merchantId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha na validação do merchant');
      }

      return await response.json();
    } catch (err: any) {
      console.error('Erro na validação do merchant:', err);
      throw err;
    }
  }, [merchantId]);

  const initiatePayment = useCallback(async (
    amount: string, 
    paymentOptions: ApplePayPaymentOptions = {}
  ): Promise<any> => {
    if (!isAvailable) {
      throw new Error('Apple Pay não está disponível');
    }

    try {
      const {
        displayItems = [],
        shippingOptions = [],
        requestShipping = false,
        requestBilling = false,
        requestPayerName = true,
        requestPayerEmail = true,
        requestPayerPhone = false,
        requiredShippingContactFields = [],
        requiredBillingContactFields = []
      } = paymentOptions;

      // Configurar método de pagamento
      const method = {
        supportedMethods: 'https://apple.com/apple-pay',
        data: {
          countryCode,
          currencyCode: currency,
          supportedNetworks,
          merchantCapabilities,
          total: {
            label: 'Total',
            amount
          },
          displayItems: displayItems.map(item => ({
            label: item.label,
            amount: item.amount,
            type: item.type || 'final'
          })),
          shippingOptions,
          requiredBillingContactFields: requestBilling ? 
            ['postalAddress', ...requiredBillingContactFields] : 
            requiredBillingContactFields,
          requiredShippingContactFields: requestShipping ? 
            ['postalAddress', 'name', 'phone', ...requiredShippingContactFields] : 
            requiredShippingContactFields
        }
      };

      // Configurar detalhes do pagamento
      const details = {
        total: {
          label: 'Total',
          amount: {
            currency,
            value: amount
          }
        },
        displayItems: displayItems.map(item => ({
          label: item.label,
          amount: {
            currency,
            value: item.amount
          }
        })),
        shippingOptions: shippingOptions.map(option => ({
          id: option.id,
          label: option.label,
          amount: {
            currency,
            value: option.amount
          },
          selected: option.selected || false
        }))
      };

      // Configurar opções
      const requestOptions = {
        requestPayerName,
        requestPayerEmail,
        requestPayerPhone,
        requestShipping,
        shippingType: requestShipping ? 'shipping' as const : undefined
      };

      // Criar request
      const request = new PaymentRequest([method], details, requestOptions);

      // Configurar handlers
      request.onmerchantvalidation = async (event: any) => {
        try {
          const merchantSession = await validateMerchant(event.validationURL);
          event.complete(merchantSession);
        } catch (err) {
          event.complete(Promise.reject(err));
        }
      };

      // Handler para mudanças de endereço (se shipping estiver habilitado)
      if (requestShipping) {
        request.onshippingaddresschange = async (event: any) => {
          // Você pode implementar lógica personalizada aqui
          // Por exemplo, recalcular taxas baseado no endereço
          const updatedDetails = {
            total: {
              label: 'Total',
              amount: {
                currency,
                value: amount
              }
            },
            displayItems: displayItems.map(item => ({
              label: item.label,
              amount: {
                currency,
                value: item.amount
              }
            }))
          };

          event.updateWith(Promise.resolve(updatedDetails));
        };

        request.onshippingoptionchange = async (event: any) => {
          // Implementar lógica para mudança de opção de frete
          const updatedDetails = {
            total: {
              label: 'Total',
              amount: {
                currency,
                value: amount
              }
            }
          };

          event.updateWith(Promise.resolve(updatedDetails));
        };
      }

      // Mostrar a tela de pagamento
      const response = await request.show();

      // Processar o pagamento
      const processResponse = await fetch('/api/payments/apple-pay/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentData: response.details,
          billingContact: response.payerName ? {
            name: response.payerName,
            email: response.payerEmail,
            phone: response.payerPhone
          } : undefined,
          shippingContact: response.shippingAddress,
          amount,
          currency
        }),
      });

      if (!processResponse.ok) {
        const errorData = await processResponse.json();
        await response.complete('fail');
        throw new Error(errorData.error || 'Falha no processamento do pagamento');
      }

      const result = await processResponse.json();
      await response.complete('success');

      return {
        success: true,
        transactionId: result.transactionId,
        paymentResponse: response,
        processResult: result
      };

    } catch (err: any) {
      console.error('Erro no pagamento Apple Pay:', err);
      throw err;
    }
  }, [isAvailable, currency, countryCode, supportedNetworks, merchantCapabilities, validateMerchant]);

  return {
    isAvailable,
    isLoading,
    canMakePayments,
    error,
    initiatePayment,
    validateMerchant
  };
};

export default useApplePay;

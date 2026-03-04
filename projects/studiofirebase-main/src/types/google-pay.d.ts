export { };

declare global {
  interface Window {
    google?: {
      payments?: {
        api?: {
          PaymentsClient: new (options: { environment: 'TEST' | 'PRODUCTION' | string }) => {
            isReadyToPay: (request: unknown) => Promise<{ result: boolean }>;
            createButton: (options: { onClick: () => void }) => HTMLElement;
            loadPaymentData: (request: unknown) => Promise<any>;
          };
        };
      };
    };
  }
}

/**
 * Global type declarations for external SDKs
 */

interface PayPalNamespace {
    createInstance: (config: any) => Promise<any>;
    Buttons?: any;
}

declare global {
    interface Window {
        paypal?: PayPalNamespace;
    }
}

export { };

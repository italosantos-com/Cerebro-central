declare module "@jest/globals";
declare module "@firebase/rules-unit-testing";

declare module "nodemailer" {
    const nodemailer: any;
    export default nodemailer;
    export type Transporter = any;
}

declare module "qrcode" {
    export type QRCodeToDataURLOptions = any;

    export function toDataURL(text: string, options?: QRCodeToDataURLOptions): Promise<string>;

    const QRCode: {
        toDataURL: typeof toDataURL;
    };
    export default QRCode;
}

declare module "braintree" {
    const braintree: any;
    export default braintree;
}
declare module "braintree-web-drop-in-react" {
    const DropIn: any;
    export default DropIn;
}

declare module "@mercadopago/sdk-react" {
    export const Wallet: any;
    export const initMercadoPago: any;
}

declare module "recharts";

declare module "@radix-ui/react-checkbox";
declare module "@radix-ui/react-menubar";
declare module "@radix-ui/react-popover";
declare module "@radix-ui/react-slider";
declare module "@radix-ui/react-tooltip";
declare module "@tiptap/extension-link";
declare module "@tiptap/extension-underline";

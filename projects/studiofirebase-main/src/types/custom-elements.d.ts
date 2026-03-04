import type React from 'react';

declare global {
    namespace JSX {
        interface IntrinsicElements {
            'paypal-add-to-cart-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
                'data-id'?: string;
                [key: string]: any;
            };
        }
    }
}

export { };

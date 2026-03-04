/**
 * Type declarations for CSS modules and CSS imports
 */

declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module './globals.css';
declare module '@/styles/braintree.css';

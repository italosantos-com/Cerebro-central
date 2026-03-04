'use client';

import React, { useEffect, useRef } from 'react';

interface ApplePayButtonCSSProps {
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  buttonType?: 'plain' | 'buy' | 'set-up' | 'donate' | 'check-out' | 'book' | 'subscribe';
  buttonStyle?: 'black' | 'white' | 'white-outline';
  width?: number | string;
  height?: number | string;
  ariaLabel?: string;
  lang?: string;
}

/**
 * Official Apple Pay button using CSS -webkit-appearance
 * This renders the native Apple Pay button as per Apple's guidelines
 */
export const ApplePayButtonCSS: React.FC<ApplePayButtonCSSProps> = ({
  onClick,
  disabled = false,
  className = '',
  buttonType = 'plain',
  buttonStyle = 'black',
  width = 242,
  height = 98,
  ariaLabel = 'Pagar com Apple Pay',
  lang = 'pt-BR',
}) => {
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = buttonRef.current;
    if (!element) return;

    element.style.setProperty('-apple-pay-button-type', buttonType);
    element.style.setProperty('-apple-pay-button-style', buttonStyle);
  }, [buttonType, buttonStyle]);

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  const widthValue = typeof width === 'number' ? `${width}px` : width;
  const heightValue = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      ref={buttonRef}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={ariaLabel}
      aria-disabled={disabled}
      className={`apple-pay-button-css ${className} ${disabled ? 'disabled' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      lang={lang}
      style={{
        WebkitAppearance: '-apple-pay-button' as any,
        appearance: '-apple-pay-button' as any,
        width: widthValue,
        height: heightValue,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    />
  );
};

export default ApplePayButtonCSS;

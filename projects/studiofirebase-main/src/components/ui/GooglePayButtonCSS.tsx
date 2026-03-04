'use client';

import React from 'react';

interface GooglePayButtonCSSProps {
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  width?: number | string;
  height?: number | string;
  ariaLabel?: string;
  buttonColor?: 'black' | 'white';
  buttonType?: 'buy' | 'plain' | 'donate';
}

/**
 * Google Pay button using SVG logo
 * Based on Google's branding guidelines
 */
export const GooglePayButtonCSS: React.FC<GooglePayButtonCSSProps> = ({
  onClick,
  disabled = false,
  className = '',
  width = 242,
  height = 98,
  ariaLabel = 'Pagar com Google Pay',
  buttonColor = 'black',
  buttonType = 'plain',
}) => {
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-disabled={disabled}
      disabled={disabled}
      className={`google-pay-button-css ${className}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        backgroundColor: buttonColor === 'black' ? '#000' : '#fff',
        border: buttonColor === 'white' ? '1px solid #dadce0' : 'none',
        borderRadius: '10px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '3px',
        padding: '0 12px',
        transition: 'background-color 0.2s, box-shadow 0.2s',
        boxShadow: '0 1px 1px 0 rgba(0,0,0,0.1)',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = buttonColor === 'black' ? '#3c4043' : '#f8f9fa';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = buttonColor === 'black' ? '#000' : '#fff';
        }
      }}
    >
      <span
        aria-hidden="true"
        style={{
          fontFamily: 'Roboto, Arial, sans-serif',
          fontSize: '31px',
          fontWeight: 700,
          lineHeight: 1,
          background: 'linear-gradient(90deg, #4285F4 0%, #4285F4 25%, #34A853 25%, #34A853 50%, #FBBC05 50%, #FBBC05 75%, #EA4335 75%, #EA4335 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          userSelect: 'none',
          marginRight: '-1px',
        }}
      >
        G
      </span>
      <span
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif',
          fontSize: '24px',
          fontWeight: 600,
          color: buttonColor === 'black' ? '#fff' : '#202124',
          letterSpacing: '0',
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        Pay
      </span>
    </button>
  );
};

export default GooglePayButtonCSS;

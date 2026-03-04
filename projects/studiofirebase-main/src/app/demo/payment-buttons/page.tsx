'use client';

import React from 'react';
import { GooglePayButtonCSS } from '@/components/ui/GooglePayButtonCSS';
import { ApplePayButtonCSS } from '@/components/ui/ApplePayButtonCSS';

export default function PaymentButtonsDemoPage() {
  const handleGooglePayClick = () => {
    console.log('Google Pay button clicked');
    alert('Google Pay button clicked!');
  };

  const handleApplePayClick = () => {
    console.log('Apple Pay button clicked');
    alert('Apple Pay button clicked!');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-8 text-center">Payment Buttons Demo</h1>
          <p className="text-center text-gray-600 mb-8">
            New Google Pay and Apple Pay buttons using pure CSS (no PNG images)
          </p>

          {/* Google Pay Buttons */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 border-b pb-2">Google Pay Buttons</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-3">Large Button (242x98 - Same as PNG)</h3>
                <GooglePayButtonCSS
                  onClick={handleGooglePayClick}
                  width={242}
                  height={98}
                  buttonColor="black"
                />
              </div>

              <div>
                <h3 className="text-lg font-medium mb-3">Full Width Button</h3>
                <GooglePayButtonCSS
                  onClick={handleGooglePayClick}
                  width="100%"
                  height={48}
                  buttonColor="black"
                />
              </div>

              <div>
                <h3 className="text-lg font-medium mb-3">Disabled State</h3>
                <GooglePayButtonCSS
                  onClick={handleGooglePayClick}
                  width={242}
                  height={48}
                  buttonColor="black"
                  disabled={true}
                />
              </div>
            </div>
          </section>

          {/* Apple Pay Buttons */}
          <section>
            <h2 className="text-2xl font-semibold mb-6 border-b pb-2">Apple Pay Buttons</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-3">Large Button (242x98 - Same as PNG)</h3>
                <ApplePayButtonCSS
                  onClick={handleApplePayClick}
                  width={242}
                  height={98}
                  buttonType="plain"
                  buttonStyle="black"
                />
              </div>

              <div>
                <h3 className="text-lg font-medium mb-3">Full Width Button</h3>
                <ApplePayButtonCSS
                  onClick={handleApplePayClick}
                  width="100%"
                  height={48}
                  buttonType="plain"
                  buttonStyle="black"
                />
              </div>

              <div>
                <h3 className="text-lg font-medium mb-3">Disabled State</h3>
                <ApplePayButtonCSS
                  onClick={handleApplePayClick}
                  width={242}
                  height={48}
                  buttonType="plain"
                  buttonStyle="black"
                  disabled={true}
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

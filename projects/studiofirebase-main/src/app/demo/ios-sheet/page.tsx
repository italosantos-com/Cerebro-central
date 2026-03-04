"use client";

import { useState } from 'react';
import IOSSubscriptionSheet from '@/components/ios-subscription-sheet';
import { Button } from '@/components/ui/button';

export default function IOSSheetDemo() {
  const [isSheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-b from-gray-100 to-gray-200">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-4xl font-bold text-gray-900">
          iOS Navigation Sheet Demo
        </h1>
        <p className="text-gray-600">
          Click the button below to open the iOS-style navigation sheet.
        </p>
        <Button 
          onClick={() => setSheetOpen(true)}
          size="lg"
          className="w-full"
        >
          Open iOS Navigation Sheet
        </Button>
        
        <div className="mt-8 p-6 bg-white rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Features:</h2>
          <ul className="text-left space-y-2 text-gray-700">
            <li>✓ Native iOS design following Apple HIG</li>
            <li>✓ Animated sheet with backdrop blur</li>
            <li>✓ Navigation menu with expandable sections</li>
            <li>✓ Dark mode support</li>
            <li>✓ Haptic feedback on interactions</li>
            <li>✓ Safe area support for iOS devices</li>
            <li>✓ PWA ready with manifest.json</li>
          </ul>
        </div>
      </div>

      <IOSSubscriptionSheet 
        isOpen={isSheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  );
}

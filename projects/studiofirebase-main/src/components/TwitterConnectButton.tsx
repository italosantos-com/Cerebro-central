
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface TwitterConnectButtonProps {
  isConnected: boolean;
}

export default function TwitterConnectButton({ isConnected }: TwitterConnectButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = () => {
    setIsLoading(true);
    window.location.href = '/api/auth/twitter-login';
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/auth/twitter-logout', { method: 'POST' });
      // It's a good practice to reload the page to get the updated server-side props
      window.location.reload();
    } catch (error) {
      console.error('Failed to disconnect from Twitter:', error);
      setIsLoading(false);
    }
  };

  if (isConnected) {
    return (
      <Button onClick={handleDisconnect} disabled={isLoading} variant="destructive">
        {isLoading ? 'Disconnecting...' : 'Disconnect from Twitter'}
      </Button>
    );
  }

  return (
    <Button onClick={handleConnect} disabled={isLoading}>
      {isLoading ? 'Connecting...' : 'Connect to Twitter'}
    </Button>
  );
}

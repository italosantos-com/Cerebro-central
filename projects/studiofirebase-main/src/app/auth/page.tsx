"use client";

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page now only serves to redirect to the new auth page.
export default function AuthPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/auth/face');
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <p className="text-muted-foreground">Redirecionando para a autenticação...</p>
    </div>
  );
}

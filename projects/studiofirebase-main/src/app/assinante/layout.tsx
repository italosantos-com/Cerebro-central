
"use client";

import { ReactNode } from 'react';

export default function AssinanteLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Layout simplificado - não bloquear acesso
  // A verificação de assinatura é feita na própria página
  return <>{children}</>;
}

"use client";

import { usePathname } from 'next/navigation';
import HeaderTopBar from '@/components/layout/header-top-bar';
import HeaderTopStripe from '@/components/layout/header-top-stripe';

const Header = ({ onMenuClick }: { onMenuClick: () => void }) => {
  const pathname = usePathname();

  // Não mostrar menu hambúrguer em páginas de autenticação
  const showMenuButton = !pathname?.startsWith('/auth');

  return (
    <header className="sticky top-0 z-50 w-full bg-background/98 backdrop-blur-md border-b border-primary/30 shadow-md">
      <HeaderTopStripe />

      <HeaderTopBar showMenuButton={showMenuButton} onMenuClick={onMenuClick} />

      {/* Bottom stripe to identify header end */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-primary/60 to-transparent"></div>
    </header>
  );
};

export default Header;

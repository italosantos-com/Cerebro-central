"use client";

import { Button } from '@/components/ui/button';
import { Home, Menu } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useProfileSettings } from '@/hooks/use-profile-settings';
import { getContextualHomePath } from '@/utils/public-admin-scope';

const UserNav = dynamic(() => import('@/components/user-nav'), { ssr: false, loading: () => null });
const GoogleTranslate = dynamic(() => import('@/components/common/GoogleTranslate'), { ssr: false, loading: () => null });

interface HeaderTopBarProps {
  showMenuButton: boolean;
  onMenuClick: () => void;
}

const HeaderTopBar = ({ showMenuButton, onMenuClick }: HeaderTopBarProps) => {
  const pathname = usePathname();
  const { settings: profileSettings, isLoading: profileLoading } = useProfileSettings();
  const displayProfileName = profileSettings?.name || 'Italo Santos';
  const homeHref = getContextualHomePath(pathname);

  return (
    <div className="container flex h-14 max-w-screen-2xl items-center justify-between relative bg-background/98">
      <div className="flex items-center space-x-2">
        {showMenuButton && (
          <Button variant="ghost" size="icon" onClick={onMenuClick} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-black bg-transparent text-black transition-all duration-200 hover:bg-black hover:text-white shadow-md !shadow-none">
            <Menu className="h-6 w-6" strokeWidth={2.5} />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        )}
        <Link href={homeHref} aria-label="Início" className="inline-flex h-9 w-9 items-center justify-center rounded-md border-2 border-primary bg-primary text-primary-foreground transition-all duration-200 hover:bg-primary/90 hover:border-primary/90 hover:shadow-2xl shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
          <Home className="h-5 w-5" strokeWidth={3} />
        </Link>
      </div>

      <div className="flex-1 flex justify-center px-4 items-center">
        {profileLoading ? (
          <div className="h-8 w-40 bg-primary/20 rounded animate-pulse" />
        ) : (
          <h2 
            className="font-bold truncate text-primary leading-tight"
            style={{
              fontSize: 'clamp(1.63rem, 3.9vw, 2.93rem)',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.6)'
            }}
          >
            {displayProfileName}
          </h2>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <GoogleTranslate />
        <UserNav />
      </div>
    </div>
  );
};

export default HeaderTopBar;

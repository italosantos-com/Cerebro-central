
"use client";

import Link from "next/link";
import { Home, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import GoogleTranslate from '@/components/common/GoogleTranslate';
import ReportProfileModal from "@/components/admin/report-profile-modal";
import HeaderTopStripe from "@/components/layout/header-top-stripe";
import { usePathname } from "next/navigation";
import { getContextualHomePath } from "@/utils/public-admin-scope";

interface AdminHeaderProps {
  onMenuClick: () => void;
}

export default function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const pathname = usePathname();
  const homeHref = getContextualHomePath(pathname);

  return (
    <header className="sticky top-0 z-50 w-full safari-nav-header">
      <HeaderTopStripe colorClass="via-sidebar-accent" />

      <div className="container flex h-14 max-w-screen-2xl items-center justify-between relative">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="text-muted-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/10 !shadow-none md:hidden transition-all duration-200"
          >
            <Menu className="h-6 w-6" strokeWidth={2} />
            <span className="sr-only">Toggle Menu</span>
          </Button>
          <Link href={homeHref} aria-label="Início" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-sidebar-accent/30 bg-sidebar-background text-sidebar-accent-foreground transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            <Home className="h-5 w-5" strokeWidth={2.4} />
          </Link>
        </div>
        <div className="flex-1 flex justify-center px-4">
          {/* Espaço reservado para ações centrais */}
        </div>
        <div className="flex items-center space-x-2">
          <ReportProfileModal />
          <GoogleTranslate />
        </div>
      </div>

      {/* Bottom stripe to identify header end */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-sidebar-accent/60 to-transparent"></div>
    </header>
  );
}

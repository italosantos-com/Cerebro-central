'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { User, LogOut, Crown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserAuth } from '@/hooks/use-user-auth';
import { useProfileSettings } from '@/hooks/use-profile-settings';

export default function UserNav() {
  // Sempre executar todos os hooks primeiro
  const { user, userProfile, handleLogout } = useUserAuth();
  const { settings } = useProfileSettings();
  const router = useRouter();
  const resolvedAvatarUrl = settings?.profilePictureUrl || userProfile?.photoURL || '/placeholder-photo.svg';

  // Renderização condicional apenas no final
  if (!user || !userProfile) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:ring-2 hover:ring-sidebar-accent transition-all duration-200">
          <span className="relative inline-block">
            <Avatar className="h-10 w-10 border-2 border-sidebar-border">
              <AvatarImage src={resolvedAvatarUrl} alt={userProfile.displayName} />
              <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground font-semibold">
                {userProfile.displayName?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            {userProfile.isSubscriber && (
              <span className="absolute -top-2 -right-2 bg-transparent">
                <Crown className="w-5 h-5 text-yellow-400 drop-shadow-md" strokeWidth={2.5} fill="#fde047" />
              </span>
            )}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 glass-dark" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-semibold leading-none">
                {userProfile.displayName || 'Carregando...'}
              </p>
              {userProfile.isSubscriber && (
                <Badge variant="default" className="h-5 bg-gradient-to-r from-yellow-400 to-yellow-600 shadow-sm">
                  <Crown className="w-3 h-3 mr-1" />
                  VIP
                </Badge>
              )}
            </div>
            <p className="text-xs leading-none text-muted-foreground">
              {userProfile.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <Link href="/perfil">
          <DropdownMenuItem className="cursor-pointer hover:bg-sidebar-accent/10 transition-all duration-200">
            <User className="mr-2 h-4 w-4" strokeWidth={2} />
            <span className="font-medium">Perfil</span>
          </DropdownMenuItem>
        </Link>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10 focus:text-destructive focus:bg-destructive/10 transition-all duration-200"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" strokeWidth={2} />
          <span className="font-medium">Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

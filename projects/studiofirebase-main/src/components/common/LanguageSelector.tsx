"use client";

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Alias para compatibilidade com o header que importa LanguageSelector
export { default } from './GoogleTranslate';

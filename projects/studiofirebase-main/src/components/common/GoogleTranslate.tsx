"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Languages, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocalization } from '@/contexts/LocalizationContext';

interface GoogleTranslateProps {
  className?: string;
}

const GoogleTranslate = ({ className = "" }: GoogleTranslateProps) => {
  const { availableLanguages, language, changeLanguage, isTranslating, translations, currency, error } = useLocalization();
  const [pendingLanguage, setPendingLanguage] = useState<string | null>(null);

  const handleLanguageChange = async (code: string) => {
    setPendingLanguage(code);
    try {
      await changeLanguage(code);
    } finally {
      setPendingLanguage(null);
    }
  };

  const currentLanguage = availableLanguages.find(l => l.code === language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`text-muted-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/10 !shadow-none transition-all duration-200 ${className}`}
          title={currentLanguage ? `Idioma: ${currentLanguage.label}` : 'Traduzir página'}
          disabled={isTranslating}
        >
          {isTranslating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Languages className="h-5 w-5" />}
          <span className="sr-only">Configurações de idioma e câmbio</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <div className="px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground">Idioma &amp; câmbio</div>
        <DropdownMenuSeparator />
        {availableLanguages.map(option => (
          <DropdownMenuItem
            key={option.code}
            onClick={() => handleLanguageChange(option.code)}
            className="cursor-pointer flex items-center justify-between"
          >
            <div className="flex flex-col">
              <span className="text-sm">{option.label}</span>
              {language === option.code && <span className="text-xs text-primary">Ativo</span>}
            </div>
            {pendingLanguage === option.code && isTranslating && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="px-3 py-2 text-sm">
          <p className="font-semibold leading-tight">{translations['cta.primary']}</p>
          <p className="text-xs text-muted-foreground">{translations['cta.subtitle']}</p>
          <p className="text-[11px] text-muted-foreground mt-2">
            {currency.currencyCode === 'BRL'
              ? `R$ ${currency.amount.toFixed(2)}`
              : `≈ ${currency.currencySymbol}${currency.amount.toFixed(2)} ${currency.currencyCode}`}
          </p>
          {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default GoogleTranslate;

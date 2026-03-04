"use client";

import Link from 'next/link';
import { Twitter, Instagram, Youtube, Facebook, Send, MessageCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useEffect } from 'react';
import { useProfileSettings } from '@/hooks/use-profile-settings';

declare global {
  interface Window {
    FB: any;
  }
}

const MainFooter = () => {
    const { settings: adminSettings } = useProfileSettings();

    useEffect(() => {
        if (typeof window !== 'undefined' && window.FB) {
            window.FB.XFBML.parse();
        }
    }, []);

    return (
        <footer className="w-full px-4 py-3 text-center text-xs sm:text-sm text-foreground/70 bg-card/30 border-t border-primary/20">
            <Separator className="mb-3 bg-primary/20" />

            
            {/* Facebook Like Button */}
            <div className="my-3 flex justify-center">
                <div
                    className="fb-like"
                    data-share="true"
                    data-width="450"
                    data-show-faces="true"
                >
                </div>
            </div>
            
            {/* Copyright */}
            <p className="font-medium">Copyrights © Italo Santos 2019 - Todos os direitos reservados</p>
            <p className="font-medium">Inscrito no CNPJ 44.970.751/0001-06</p>
            
            {/* Ícones dinâmicos das redes sociais baseados nas configurações do footer */}
            <div className="flex justify-center gap-4 my-3">
                {adminSettings?.footerSettings?.showTwitter && adminSettings.footerSettings.twitterUrl && (
                    <Link 
                        href={adminSettings.footerSettings.twitterUrl}
                        target="_blank" 
                        rel="noopener noreferrer"
                        aria-label="Twitter"
                        className="hover:scale-110 transition-all duration-200"
                    >
                        <Twitter className="h-4 w-4 sm:h-5 sm:w-5 text-foreground/70 hover:text-primary-hover" strokeWidth={2} />
                    </Link>
                )}
                
                {adminSettings?.footerSettings?.showInstagram && adminSettings.footerSettings.instagramUrl && (
                    <Link 
                        href={adminSettings.footerSettings.instagramUrl}
                        target="_blank" 
                        rel="noopener noreferrer"
                        aria-label="Instagram"
                        className="hover:scale-110 transition-all duration-200"
                    >
                        <Instagram className="h-4 w-4 sm:h-5 sm:w-5 text-foreground/70 hover:text-primary-hover" strokeWidth={2} />
                    </Link>
                )}
                
                {adminSettings?.footerSettings?.showYoutube && adminSettings.footerSettings.youtubeUrl && (
                    <Link 
                        href={adminSettings.footerSettings.youtubeUrl}
                        target="_blank" 
                        rel="noopener noreferrer"
                        aria-label="YouTube"
                        className="hover:scale-110 transition-all duration-200"
                    >
                        <Youtube className="h-4 w-4 sm:h-5 sm:w-5 text-foreground/70 hover:text-primary-hover" strokeWidth={2} />
                    </Link>
                )}
                
                {adminSettings?.footerSettings?.showWhatsapp && adminSettings.footerSettings.whatsappUrl && (
                    <Link 
                        href={adminSettings.footerSettings.whatsappUrl}
                        target="_blank" 
                        rel="noopener noreferrer"
                        aria-label="WhatsApp"
                        className="hover:scale-110 transition-all duration-200"
                    >
                        <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 text-foreground/70 hover:text-primary-hover" strokeWidth={2} />
                    </Link>
                )}
                
                {adminSettings?.footerSettings?.showTelegram && adminSettings.footerSettings.telegramUrl && (
                    <Link 
                        href={adminSettings.footerSettings.telegramUrl}
                        target="_blank" 
                        rel="noopener noreferrer"
                        aria-label="Telegram"
                        className="hover:scale-110 transition-all duration-200"
                    >
                        <Send className="h-4 w-4 sm:h-5 sm:w-5 text-foreground/70 hover:text-primary-hover" strokeWidth={2} />
                    </Link>
                )}

                {adminSettings?.footerSettings?.showFacebook && adminSettings.footerSettings.facebookUrl && (
                    <Link 
                        href={adminSettings.footerSettings.facebookUrl}
                        target="_blank" 
                        rel="noopener noreferrer"
                        aria-label="Facebook"
                        className="hover:scale-110 transition-all duration-200"
                    >
                        <Facebook className="h-4 w-4 sm:h-5 sm:w-5 text-foreground/70 hover:text-primary-hover" strokeWidth={2} />
                    </Link>
                )}

                {/* Fallback: Se não há configurações do footer, mostrar ícones padrão */}
                {(!adminSettings?.footerSettings || 
                  (!adminSettings.footerSettings.showTwitter && 
                   !adminSettings.footerSettings.showInstagram && 
                   !adminSettings.footerSettings.showYoutube && 
                   !adminSettings.footerSettings.showWhatsapp && 
                   !adminSettings.footerSettings.showTelegram && 
                   !adminSettings.footerSettings.showFacebook)) && (
                    <>
                        <Link href="https://twitter.com/italosantos" target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="hover:scale-110 transition-all duration-200">
                            <Twitter className="h-4 w-4 sm:h-5 sm:w-5 text-foreground/70 hover:text-primary-hover" strokeWidth={2} />
                        </Link>
                        <Link href="https://instagram.com/italosantos" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:scale-110 transition-all duration-200">
                            <Instagram className="h-4 w-4 sm:h-5 sm:w-5 text-foreground/70 hover:text-primary-hover" strokeWidth={2} />
                        </Link>
                        <Link href="https://youtube.com/@ItaloProfissional" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="hover:scale-110 transition-all duration-200">
                            <Youtube className="h-4 w-4 sm:h-5 sm:w-5 text-foreground/70 hover:text-primary-hover" strokeWidth={2} />
                        </Link>
                        <Link href="https://wa.me/5521990479104" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="hover:scale-110 transition-all duration-200">
                            <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 text-foreground/70 hover:text-primary-hover" strokeWidth={2} />
                        </Link>
                    </>
                )}
            </div>
            
            {/* Links Legais */}
            <p className="font-medium">
                <Link href="/termos-condicoes" className="underline hover:text-primary-hover transition-colors duration-200">
                    Termos & Condições
                </Link> 
                {' | '} 
                <Link href="/politica-de-privacidade" className="underline hover:text-primary-hover transition-colors duration-200">
                    Política de Privacidade
                </Link>
            </p>
            
            {/* Disclaimer */}
            <p className="mt-1 text-xs leading-snug">Este site inclui conteúdo protegido por direitos autorais, é proibida reprodução total ou parcial deste conteúdo sem autorização prévia do proprietário do site.</p>
        </footer>
    );
};

export default MainFooter;
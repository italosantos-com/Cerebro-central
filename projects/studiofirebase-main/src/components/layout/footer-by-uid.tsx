"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Heart, Mail, Phone } from "lucide-react";
import Link from "next/link";

interface FooterSettings {
  displayName?: string;
  description?: string;
  contactEmail?: string;
  phoneNumber?: string;
  socialMedia?: {
    instagram?: string;
    twitter?: string;
    whatsapp?: string;
    telegram?: string;
  };
  copyrightText?: string;
  customLinks?: Array<{ label: string; url: string }>;
}

interface FooterByUidProps {
  adminUid: string;
}

export default function FooterByUid({ adminUid }: FooterByUidProps) {
  const [settings, setSettings] = useState<FooterSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFooterSettings = async () => {
      try {
        // Tentar carregar configurações personalizadas do admin
        const settingsRef = doc(db, "admins", adminUid, "profile", "settings");
        const settingsSnap = await getDoc(settingsRef);

        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          setSettings({
            displayName: data.displayName || data.name,
            description: data.description,
            contactEmail: data.contactEmail || data.email,
            phoneNumber: data.phoneNumber,
            socialMedia: data.socialMedia,
            copyrightText: data.copyrightText,
            customLinks: data.customLinks,
          });
        } else {
          // Fallback para dados do admin
          const adminRef = doc(db, "admins", adminUid);
          const adminSnap = await getDoc(adminRef);
          if (adminSnap.exists()) {
            const data = adminSnap.data();
            setSettings({
              displayName: data.name,
              contactEmail: data.email,
              phoneNumber: data.phone,
            });
          }
        }
      } catch (error) {
        console.error("[FooterByUid] Erro ao carregar configurações:", error);
      } finally {
        setLoading(false);
      }
    };

    if (adminUid) {
      loadFooterSettings();
    }
  }, [adminUid]);

  if (loading) {
    return (
      <footer className="bg-card/50 border-t border-primary/20 text-foreground py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-foreground/50">
          Carregando...
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-card/50 border-t border-primary/20 text-foreground py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          {/* Branding */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-primary">
              {settings?.displayName || "Studio"}
            </h3>
            {settings?.description && (
              <p className="text-sm text-foreground/70 line-clamp-3">
                {settings.description}
              </p>
            )}
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-primary uppercase">Contato</h4>
            <div className="space-y-3">
              {settings?.contactEmail && (
                <a
                  href={`mailto:${settings.contactEmail}`}
                  className="flex items-center gap-2 text-sm text-foreground/70 hover:text-primary-hover transition"
                >
                  <Mail className="w-4 h-4" />
                  {settings.contactEmail}
                </a>
              )}
              {settings?.phoneNumber && (
                <a
                  href={`tel:${settings.phoneNumber}`}
                  className="flex items-center gap-2 text-sm text-foreground/70 hover:text-primary-hover transition"
                >
                  <Phone className="w-4 h-4" />
                  {settings.phoneNumber}
                </a>
              )}
            </div>
          </div>

          {/* Social Media */}
          {settings?.socialMedia &&
            Object.keys(settings.socialMedia).length > 0 && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-primary uppercase">
                  Redes Sociais
                </h4>
                <div className="flex flex-col gap-2">
                  {settings.socialMedia.instagram && (
                    <a
                      href={`https://instagram.com/${settings.socialMedia.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-foreground/70 hover:text-primary-hover transition"
                    >
                      Instagram
                    </a>
                  )}
                  {settings.socialMedia.twitter && (
                    <a
                      href={`https://twitter.com/${settings.socialMedia.twitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-foreground/70 hover:text-primary-hover transition"
                    >
                      Twitter
                    </a>
                  )}
                  {settings.socialMedia.whatsapp && (
                    <a
                      href={`https://wa.me/${settings.socialMedia.whatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-foreground/70 hover:text-primary-hover transition"
                    >
                      WhatsApp
                    </a>
                  )}
                  {settings.socialMedia.telegram && (
                    <a
                      href={`https://t.me/${settings.socialMedia.telegram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-foreground/70 hover:text-primary-hover transition"
                    >
                      Telegram
                    </a>
                  )}
                </div>
              </div>
            )}

          {/* Links */}
          {settings?.customLinks && settings.customLinks.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-primary uppercase">Links</h4>
              <div className="flex flex-col gap-2">
                {settings.customLinks.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-foreground/70 hover:text-primary-hover transition"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-primary/20 mb-4"></div>

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-foreground/50">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-primary" />
            <p>
              {settings?.copyrightText ||
                `© ${new Date().getFullYear()} ${settings?.displayName || "Studio"}. Todos os direitos reservados.`}
            </p>
          </div>

          {/* Legal Links */}
          <div className="flex gap-6 text-xs">
            <Link
              href="/politica-de-privacidade"
              className="hover:text-primary-hover transition"
            >
              Privacidade
            </Link>
            <Link
              href="/termos-condicoes"
              className="hover:text-primary-hover transition"
            >
              Termos
            </Link>
            <Link
              href="/admin"
              className="hover:text-primary-hover transition"
            >
              Painel
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

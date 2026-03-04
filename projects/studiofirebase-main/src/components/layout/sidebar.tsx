
"use client";

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { X, Video, Flame, Image as ImageIcon, Crown, Package, LifeBuoy } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { fetishCategories, Fetish } from '@/lib/fetish-data';
import AboutSection from '@/components/about-section';
import { useProfileSettings } from '@/hooks/use-profile-settings';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { getContextualPublicPath } from '@/utils/public-admin-scope';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onFetishSelect: (fetish: Fetish) => void;
}

interface FirestoreCategory {
  id: string;
  name: string;
  slug: string;
  order_index: number;
  status: boolean;
}

interface FirestoreTopic {
  id: string;
  category_id: string;
  title: string;
  content: string;
  summary?: string;
  status: boolean;
}

  const Sidebar = ({ isOpen, onClose, onFetishSelect }: SidebarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const { adultWorkLabel, showAdultContent, settings } = useProfileSettings();
  const [firestoreCategories, setFirestoreCategories] = useState<FirestoreCategory[]>([]);
  const [firestoreTopics, setFirestoreTopics] = useState<FirestoreTopic[]>([]);
  const toPublicPath = (path: string) => getContextualPublicPath(pathname, path);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [catsSnap, topicsSnap] = await Promise.all([
          getDocs(query(collection(db, 'categories'), where('status', '==', true), orderBy('order_index'))),
          getDocs(query(collection(db, 'topics'), where('status', '==', true))),
        ]);
        if (!cancelled) {
          setFirestoreCategories(catsSnap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreCategory)));
          setFirestoreTopics(topicsSnap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreTopic)));
        }
      } catch {
        // Firestore unavailable or index not ready — fall back to settings/static data
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Shared menu item styling with premium black aesthetic
  const menuItemClassName = "flex items-center gap-4 px-4 py-3 rounded-lg font-medium text-white/70 hover:text-white hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5 border-l-[3px] border-transparent hover:border-white/30 transition-all duration-200 hover:shadow-lg hover:shadow-white/10";

  const handleNavigate = (path: string) => {
    router.push(path);
    onClose();
  };

  const handleFetishClick = (item: Fetish) => {
    onFetishSelect(item);
    onClose();
  };

  // Prefer Firestore categories/topics when available, otherwise fall back to settings or static data
  const hasFirestoreContent = firestoreCategories.length > 0;

  const resolvedFetishCategories: Record<string, Fetish[]> = (() => {
    if (hasFirestoreContent) {
      return firestoreCategories.reduce<Record<string, Fetish[]>>((acc, cat) => {
        const items = firestoreTopics
          .filter(t => t.category_id === cat.id)
          .map(t => ({
            id: t.id,
            title: t.title,
            description: t.summary || t.content,
            imageUrl: '/placeholder-photo.svg',
            aiHint: 'content-topic',
          }));
        if (items.length > 0) acc[cat.name] = items;
        return acc;
      }, {});
    }
    const customFetishCategories = settings?.fetishMenu?.categories?.filter(category => category.name?.trim()) || [];
    const hasCustomFetishMenu = customFetishCategories.length > 0;
    if (hasCustomFetishMenu) {
      return customFetishCategories.reduce<Record<string, Fetish[]>>((acc, category) => {
        const safeName = category.name.trim();
        const items = category.items || [];
        acc[safeName] = items
          .filter(item => item.title?.trim())
          .map((item, index) => ({
            id: `${safeName.toLowerCase().replace(/\s+/g, '-')}-${index}`,
            title: item.title.trim(),
            description: item.description?.trim() || 'Descrição não informada.',
            imageUrl: '/placeholder-photo.svg',
            aiHint: 'custom-fetish'
          }));
        return acc;
      }, {});
    }
    return fetishCategories;
  })();

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/90 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <aside className={`fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-black/95 to-black/90 backdrop-blur-xl border-r border-white/10 shadow-2xl z-50 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex justify-between items-center border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
          <h2 className="text-xl font-bold text-white/90 tracking-wide">MENU</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200 rounded-lg">
            <X className="h-6 w-6" strokeWidth={2.5} />
          </Button>
        </div>
        <nav className="p-5 overflow-y-auto h-[calc(100%-77px)] custom-scrollbar">
          <ul className="space-y-3 flex flex-col min-h-full">
            <li>
              <div className="flex flex-col items-center gap-3 py-4 px-2 bg-gradient-to-b from-white/5 to-transparent rounded-lg">
                <Avatar className="h-16 w-16 border-2 border-white/20 shadow-lg hover:border-white/40 transition-all">
                  <AvatarImage src={settings?.profilePictureUrl || '/placeholder-photo.svg'} alt={settings?.name || 'Perfil'} />
                  <AvatarFallback className="bg-gradient-to-br from-white/20 to-white/10 text-white font-bold text-lg">
                    {(settings?.name?.charAt(0) || 'I').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {!!settings?.name && (
                  <span className="text-sm font-semibold text-white/80 text-center">
                    {settings.name}
                  </span>
                )}
              </div>
            </li>
            {showAdultContent && (
              <>
                <li>
                  <div className="bg-gradient-to-r from-white/15 to-white/5 text-white text-center text-xs font-bold p-3 uppercase tracking-widest rounded-lg mb-4 mt-4 shadow-lg border border-white/20 hover:border-white/40 hover:from-white/20 transition-all">
                    {adultWorkLabel}
                  </div>
                </li>

                <li>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="fetish-bdsm" className="border-none">
                      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5 rounded-lg text-base font-semibold text-white/70 hover:text-white border-l-[3px] border-transparent hover:border-white/30 transition-all duration-200 hover:shadow-lg hover:shadow-white/10">
                        <span className="flex items-center gap-4">
                          <Flame className="h-5 w-5 flex-shrink-0" strokeWidth={2.5} />
                          <span>CONTEÚDO</span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="pl-4">
                        <Accordion type="multiple" className="w-full">
                          {Object.entries(resolvedFetishCategories).map(([category, items]) => (
                            <AccordionItem key={category} value={category} className="border-none">
                              <AccordionTrigger className="py-2 px-3 text-sm font-semibold hover:no-underline hover:bg-gradient-to-r hover:from-white/8 hover:to-transparent rounded-md text-white/60 hover:text-white/90 transition-all hover:shadow-md">{category}</AccordionTrigger>
                              <AccordionContent className="pl-4">
                                <ul className="space-y-2 pt-2">
                                  {items.map((item) => (
                                    <li key={item.id}>
                                      <button onClick={() => handleFetishClick(item)} className="block w-full text-left px-3 py-2 text-sm rounded-md text-white/60 hover:text-white hover:bg-gradient-to-r hover:from-white/8 hover:to-transparent border-l-[3px] border-transparent hover:border-white/20 transition-all font-medium">
                                        {item.title}
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </li>
              </>
            )}

            <li>
              <Link href={toPublicPath('/fotos')} className={menuItemClassName} onClick={onClose}>
                <ImageIcon className="h-5 w-5 flex-shrink-0" strokeWidth={2.5} />
                <span>FOTOS</span>
              </Link>
            </li>
            <li>
              <Link href={toPublicPath('/videos')} className={menuItemClassName} onClick={onClose}>
                <Video className="h-5 w-5 flex-shrink-0" strokeWidth={2.5} />
                <span>VÍDEOS</span>
              </Link>
            </li>
            <li>
              <Link href={toPublicPath('/galeria-assinantes')} className={menuItemClassName} onClick={onClose}>
                <Crown className="h-5 w-5 flex-shrink-0" strokeWidth={2.5} />
                <span>GALERIA EXCLUSIVA</span>
              </Link>
            </li>
            <li>
              <Link href={toPublicPath('/loja')} className={menuItemClassName} onClick={onClose}>
                <Package className="h-5 w-5 flex-shrink-0" strokeWidth={2.5} />
                <span>LOJA ON-LINE</span>
              </Link>
            </li>
            {/* <li><Link href="/aluga-se" className="block p-3 rounded-md hover:bg-muted" onClick={onClose}>ALUGA-SE</Link></li> */}
            {/* <li><Link href="/canais" className="block p-3 rounded-md hover:bg-muted" onClick={onClose}>CANAIS</Link></li> */}

            <div className="mt-auto border-t border-white/10 pt-8">
              <li className="list-none">
                <Link href={toPublicPath('/ajuda')} className={menuItemClassName} onClick={onClose}>
                  <LifeBuoy className="h-5 w-5 flex-shrink-0" strokeWidth={2.5} />
                  <span>AJUDA E SUPORTE</span>
                </Link>
              </li>
            </div>
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;

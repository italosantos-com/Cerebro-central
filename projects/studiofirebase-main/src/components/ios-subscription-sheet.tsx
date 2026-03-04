"use client";

import { useState, useMemo } from 'react';
import { X, Flame, Image as ImageIcon, Video, Crown, Package, LifeBuoy, ChevronDown } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useProfileSettings } from '@/hooks/use-profile-settings';
import { getContextualPublicPath, getPublicUsernameFromPathname } from '@/utils/public-admin-scope';
import { fetishCategories, Fetish } from '@/lib/fetish-data';
import FetishModal from '@/components/fetish-modal';

interface IOSSubscriptionSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * iOS-style navigation sheet component following Apple Human Interface Guidelines.
 * 
 * This component replaces the traditional sidebar and includes navigation menu options.
 * 
 * Note: Component name remains IOSSubscriptionSheet for backward compatibility with
 * existing imports, though it now serves as a pure navigation sheet.
 * 
 * Features:
 * - Native iOS design and animations
 * - Navigation menu (Conteúdo, Fotos, Vídeos, Loja, GALERIA EXCLUSIVA, AJUDA E SUPORTE)
 * - Dark mode support
 * - Haptic feedback
 * - PWA optimized
 */
const IOSSubscriptionSheet = ({ isOpen, onClose }: IOSSubscriptionSheetProps) => {
  const [isConteudoExpanded, setIsConteudoExpanded] = useState(false);
  const [modalInfo, setModalInfo] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selectedFetish, setSelectedFetish] = useState<Fetish | null>(null);
  const { settings } = useProfileSettings();
  const router = useRouter();
  const pathname = usePathname();
  const publicUsername = getPublicUsernameFromPathname(pathname);
  const toPublicPath = (path: string) => getContextualPublicPath(pathname, path);
  const profileName = settings?.name?.trim() || 'Italo Santos';
  const profileHandle = publicUsername ? `g.dev/${publicUsername}` : 'g.dev/italosantos';
  const profilePhoto = settings?.profilePictureUrl || '/placeholder-photo.svg';
  const profilePhotoWithVersion = useMemo(() => {
    const separator = profilePhoto.includes('?') ? '&' : '?';
    return `${profilePhoto}${separator}v=${encodeURIComponent(profilePhoto)}`;
  }, [profilePhoto]);
  const appearance = settings?.appearanceSettings;
  const normalizedBackground = (appearance?.backgroundColor || '').trim().toLowerCase();
  const normalizedContainer = (appearance?.containerColor || '').trim().toLowerCase();
  const normalizedButton = (appearance?.buttonColor || '').trim().toLowerCase();
  const normalizedText = (appearance?.textColor || '').trim().toLowerCase();
  const normalizedLine = (appearance?.lineColor || '').trim().toLowerCase();
  const normalizedIcon = (appearance?.iconColor || '').trim().toLowerCase();
  const normalizedNumber = (appearance?.numberColor || '').trim().toLowerCase();
  const isIOSTemplate =
    normalizedBackground === '#ffffff' &&
    normalizedContainer === '#f2f2f7' &&
    normalizedText === '#000000' &&
    normalizedLine === '#d1d1d6' &&
    ['#007aff', '#0a84ff'].includes(normalizedButton) &&
    ['#007aff', '#0a84ff'].includes(normalizedIcon) &&
    ['#007aff', '#0a84ff'].includes(normalizedNumber);

  // Get custom or default fetish categories
  const customFetishCategories = settings?.fetishMenu?.categories?.filter(category => {
    const hasName = category.name?.trim();
    const hasValidItems = category.items?.some(item => item.title?.trim());
    return hasName && hasValidItems;
  }) || [];
  const hasCustomFetishMenu = customFetishCategories.length > 0;

  const resolvedFetishCategories = hasCustomFetishMenu
    ? customFetishCategories.reduce<Record<string, Fetish[]>>((acc, category) => {
      const safeName = category.name.trim();
      const items = category.items || [];
      const validItems = items
        .filter(item => item.title?.trim())
        .map((item, index) => ({
          id: `${safeName.toLowerCase().replace(/\s+/g, '-')}-${index}`,
          title: item.title.trim(),
          description: item.description?.trim() || 'Descrição não informada.',
          imageUrl: '/placeholder-photo.svg',
          aiHint: 'custom-fetish'
        }));

      // Only add category if it has valid items
      if (validItems.length > 0) {
        acc[safeName] = validItems;
      }
      return acc;
    }, {})
    : fetishCategories;

  const handleRegister = () => {
    if ('vibrate' in window.navigator) {
      navigator.vibrate(10);
    }
    router.push('/auth?mode=register');
    onClose();
  };

  const handleNavigate = (path: string) => {
    if ('vibrate' in window.navigator) {
      navigator.vibrate(10);
    }
    router.push(path);
    onClose();
  };

  const toggleConteudo = () => {
    if ('vibrate' in window.navigator) {
      navigator.vibrate(10);
    }
    setIsConteudoExpanded(!isConteudoExpanded);
  } 

  const openModalInfo = (info: string) => {
    setModalInfo(info);
  } 

  const closeModalInfo = () => {
    setModalInfo(null);
  }

  const toggleCategory = (category: string) => {
    if ('vibrate' in window.navigator) {
      navigator.vibrate(10);
    }
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  return (
    <>
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="ios-backdrop"
            onClick={onClose}
          />

      {/* Sheet Container */}
      <div className={`ios-app-container ${isIOSTemplate ? '' : 'system-mode'}`}>
        <div className="ios-sheet">
          {/* Handle */}
          <div className="ios-handle"></div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="ios-close-btn"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Profile Section */}
          <div className="ios-profile">
            <img
              src={profilePhotoWithVersion}
              alt={profileName}
              className="ios-avatar"
            />
            <h1 className="ios-profile-name">
              {profileName} <span className="ios-verified">✓</span>
            </h1>
            <p className="ios-profile-link">{profileHandle}</p>
          </div>

          {/* Navigation Menu */}
          <div className="ios-menu" style={{
            padding: '16px',
            maxHeight: 'calc(100vh - 200px)',
            overflowY: 'auto',
            marginBottom: '16px',
            WebkitOverflowScrolling: 'touch'
          }}>
            {/* CONTEÚDO - Expandable com NON-PROFIT */}
            <div style={{ marginBottom: '8px' }}>
              <button
                onClick={toggleConteudo}
                className="ios-menu-button"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  background: 'rgba(0, 0, 0, 0.05)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#000',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background 0.2s, color 0.3s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)'}
              >
                <Flame className="h-5 w-5" style={{ flexShrink: 0 }} />
                <span style={{ flex: 1, textAlign: 'left' }}>CONTEÚDO</span>
                <ChevronDown
                  className="h-5 w-5"
                  style={{
                    flexShrink: 0,
                    transform: isConteudoExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s'
                  }}
                />
              </button>

              {isConteudoExpanded && (
                <div style={{ marginTop: '8px', paddingLeft: '12px' }}>
                  {/* ...existing code for resolvedFetishCategories... */}
                  {Object.entries(resolvedFetishCategories).map(([category, items]) => (
                    <div key={category} style={{ marginBottom: '8px' }}>
                      <button
                        onClick={() => toggleCategory(category)}
                        className="ios-menu-button"
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          background: 'rgba(0, 0, 0, 0.03)',
                          border: 'none',
                          borderRadius: '8px',
                          color: 'rgba(0, 0, 0, 0.9)',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'background 0.2s, color 0.3s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.08)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.03)'}
                      >
                        <span>{category}</span>
                        <ChevronDown
                          className="h-4 w-4"
                          style={{
                            transform: expandedCategory === category ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.3s'
                          }}
                        />
                      </button>

                      {expandedCategory === category && (
                        <div style={{ marginTop: '4px', paddingLeft: '12px' }}>
                          {items.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => {
                                onClose();
                                setSelectedFetish(item);
                              }}
                              className="ios-menu-button"
                              style={{
                                width: '100%',
                                display: 'block',
                                textAlign: 'left',
                                padding: '8px 12px',
                                background: 'transparent',
                                border: 'none',
                                borderRadius: '6px',
                                color: 'rgba(0, 0, 0, 0.8)',
                                fontSize: '13px',
                                fontWeight: '400',
                                cursor: 'pointer',
                                transition: 'background 0.2s, color 0.3s',
                                marginBottom: '2px'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              {item.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* FOTOS */}
            <button
              onClick={() => handleNavigate(toPublicPath('/fotos'))}
              className="ios-menu-button"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                background: 'rgba(0, 0, 0, 0.05)',
                border: 'none',
                borderRadius: '12px',
                color: '#000',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s, color 0.3s',
                marginBottom: '8px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)'}
            >
              <ImageIcon className="h-5 w-5" style={{ flexShrink: 0 }} />
              <span>FOTOS</span>
            </button>

            {/* VÍDEOS */}
            <button
              onClick={() => handleNavigate(toPublicPath('/videos'))}
              className="ios-menu-button"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                background: 'rgba(0, 0, 0, 0.05)',
                border: 'none',
                borderRadius: '12px',
                color: '#000',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s, color 0.3s',
                marginBottom: '8px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)'}
            >
              <Video className="h-5 w-5" style={{ flexShrink: 0 }} />
              <span>VÍDEOS</span>
            </button>

            <button
              onClick={() => handleNavigate(toPublicPath('/loja'))}
              className="ios-menu-button"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                background: 'rgba(0, 0, 0, 0.05)',
                border: 'none',
                borderRadius: '12px',
                color: '#000',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s, color 0.3s',
                marginBottom: '8px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)'}
            >
              <Package className="h-5 w-5" style={{ flexShrink: 0 }} />
              <span>LOJA</span>
            </button>

            {/* CONTEÚDO EXCLUSIVO */}
            <button
              onClick={() => handleNavigate(toPublicPath('/galeria-assinantes'))}
              className="ios-menu-button"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                background: 'rgba(0, 0, 0, 0.05)',
                border: 'none',
                borderRadius: '12px',
                color: '#000',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s, color 0.3s',
                marginBottom: '8px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)'}
            >
              <Crown className="h-5 w-5" style={{ flexShrink: 0 }} />
              <span>GALERIA EXCLUSIVA</span>
            </button>

            {/* Divider */}
            <div className="ios-divider" style={{
              height: '1px',
              background: 'rgba(0, 0, 0, 0.1)',
              margin: '16px 0'
            }} />

            {/* AJUDA E SUPORTE */}
            <button
              onClick={() => handleNavigate(toPublicPath('/ajuda'))}
              className="ios-menu-button"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                background: 'rgba(0, 0, 0, 0.05)',
                border: 'none',
                borderRadius: '12px',
                color: '#000',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s, color 0.3s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)'}
            >
              <LifeBuoy className="h-5 w-5" style={{ flexShrink: 0 }} />
              <span>AJUDA E SUPORTE</span>
            </button>
          </div>



          {/* Bottom Actions */}
          <div className="ios-bottom-actions">
            <button
              className="ios-primary-btn small"
              onClick={handleRegister}
            >
              Inscreva-se
            </button>
          </div>
          {/* Modal informativo Missão, Visão, Valores */}
          {modalInfo && (
            <div className="ios-modal-info" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={closeModalInfo}>
              <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', minWidth: '320px', maxWidth: '90vw', boxShadow: '0 4px 24px rgba(0,0,0,0.15)', textAlign: 'center', position: 'relative' }} onClick={e => e.stopPropagation()}>
                <button style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }} onClick={closeModalInfo}>&times;</button>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '16px' }}>{modalInfo}</h2>
                <p style={{ fontSize: '1rem', color: '#444' }}>
                  {modalInfo === 'Missão' && 'Nossa missão é promover impacto positivo e transformação social por meio de tecnologia e educação.'}
                  {modalInfo === 'Visão' && 'Nossa visão é ser referência global em inovação, inclusão e sustentabilidade.'}
                  {modalInfo === 'Valores' && 'Nossos valores incluem ética, transparência, colaboração e compromisso com a comunidade.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      </>
      )}
      {/* Floating content modal - opens when a content item is selected */}
      {selectedFetish && (
        <FetishModal
          fetish={selectedFetish}
          isOpen={!!selectedFetish}
          onClose={() => setSelectedFetish(null)}
        />
      )}
    </>
  );
};

export default IOSSubscriptionSheet;

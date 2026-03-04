export interface WebAppManifestIcon {
  src: string;
  type: string;
  sizes: string;
  purpose?: string;
}

export interface WebAppManifest {
  name: string;
  short_name: string;
  start_url: string;
  scope: string;
  display: 'fullscreen' | 'standalone' | 'minimal-ui' | 'browser';
  background_color: string;
  theme_color: string;
  orientation?: string;
  icons: WebAppManifestIcon[];
}

export const manifest: WebAppManifest = {
  name: 'Italo Santos — Portfólio',
  short_name: 'ItaloSantos',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: '#ffffff',
  theme_color: '#0d6efd',
  orientation: 'portrait-primary',
  icons: [
    {
      src: '/icon.png',
      type: 'image/png',
      sizes: '512x512',
      purpose: 'any maskable'
    }
  ]
};

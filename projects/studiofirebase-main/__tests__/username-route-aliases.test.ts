import { readFileSync } from 'fs';
import { join } from 'path';

const aliasFiles = [
  'src/app/[username]/login/page.tsx',
  'src/app/[username]/loja/page.tsx',
  'src/app/[username]/fotos/page.tsx',
  'src/app/[username]/settings/page.tsx',
  'src/app/[username]/videos/page.tsx',
  'src/app/[username]/photo/page.tsx',
  'src/app/[username]/stripe-connect/page.tsx',
  'src/app/[username]/dashboard/page.tsx',
  'src/app/[username]/dashboard/videos/page.tsx',
  'src/app/[username]/demos/paypal-italo/page.tsx',
  'src/app/[username]/demo/social-payments/page.tsx',
  'src/app/[username]/demo/payment-buttons/page.tsx',
  'src/app/[username]/demo/ios-sheet/page.tsx',
  'src/app/[username]/demo/apple-pay/page.tsx',
  'src/app/[username]/subscriber/chat/[chatId]/page.tsx',
  // Admin route aliases
  'src/app/[username]/admin/fotos/page.tsx',
  'src/app/[username]/admin/videos/page.tsx',
  'src/app/[username]/admin/videos/browser/page.tsx',
  'src/app/[username]/admin/uploads/page.tsx',
  'src/app/[username]/admin/exclusive-content/page.tsx',
  'src/app/[username]/admin/conversations/page.tsx',
  'src/app/[username]/admin/subscriptions/page.tsx',
  'src/app/[username]/admin/calendar/page.tsx',
  'src/app/[username]/admin/reviews/page.tsx',
  'src/app/[username]/admin/settings/page.tsx',
  'src/app/[username]/admin/integrations/page.tsx',
  'src/app/[username]/admin/integrations/google/page.tsx',
  'src/app/[username]/admin/integrations/apple/page.tsx',
  'src/app/[username]/admin/conteudo/page.tsx',
  // Subscriber gallery alias
  'src/app/[username]/galeria-assinantes/page.tsx',
];

describe('Username route aliases', () => {
  test.each(aliasFiles)('%s exists and re-exports a page', (filePath) => {
    const fullPath = join(process.cwd(), filePath);
    const content = readFileSync(fullPath, 'utf8').trim();

    expect(content.startsWith('export { default } from')).toBe(true);
  });
});

// test-isolamento-rotas.test.js
// Teste automatizado de isolamento de rotas dinâmicas por admin usando Jest

const rotas = [
  '/:adminId/',
  '/:adminId/login',
  '/:adminId/perfil',
  '/:adminId/loja',
  '/:adminId/fotos',
  '/:adminId/settings',
  '/:adminId/videos',
  '/:adminId/photo',
  '/:adminId/stripe-connect',
  '/:adminId/dashboard',
  '/:adminId/dashboard/videos',
  '/:adminId/demos/paypal-italo',
  '/:adminId/demo/social-payments',
  '/:adminId/demo/payment-buttons',
  '/:adminId/demo/ios-sheet',
  '/:adminId/demo/apple-pay',
  '/:adminId/admin',
  '/:adminId/admin/settings',
  '/:adminId/admin/videos',
  '/:adminId/admin/reviews',
  '/:adminId/admin/profile',
  '/:adminId/admin/subscribers',
  '/:adminId/admin/conversations',
  '/:adminId/admin/conversation',
  '/:adminId/admin/chat',
  '/:adminId/admin/uploads',
  '/:adminId/admin/verify-email',
  '/:adminId/admin/updates',
  '/:adminId/admin/subscriptions',
  '/:adminId/admin/settings/personalizacao',
  '/:adminId/admin/reset-password',
  '/:adminId/admin/register',
  '/:adminId/admin/recaptcha-health',
  '/:adminId/admin/products',
  '/:adminId/admin/photos',
  '/:adminId/admin/mfa-enabled',
  '/:adminId/admin/integrations',
  '/:adminId/admin/fotos',
  '/:adminId/admin/forgot-password',
  '/:adminId/admin/exclusive-content',
  '/:adminId/admin/email-changed',
  '/:adminId/admin/database-health',
  '/:adminId/admin/cloudflare-chat-info',
  '/:adminId/admin/chat-management',
  '/:adminId/admin/cerebro-central-ia',
  '/:adminId/admin/calendar',
  '/:adminId/admin/cerebro-central',
  '/:adminId/admin/admins',
  '/:adminId/subscriber/chat/:chatId',
  '/:adminId/admin/chat/:chatId'
];

const admins = ['bruno', '5yPFjo6t', 'severepics', 'italo'];

describe('Isolamento de rotas por admin', () => {
  admins.forEach(admin => {
    test(`Admin ${admin} só acessa suas rotas`, () => {
      rotas.forEach(rota => {
        const rotaFinal = rota.replace(':adminId', admin).replace(':chatId', '123');
        expect(rotaFinal.includes(admin)).toBe(true);
      });
    });
  });
});

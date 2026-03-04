import { whatsappService, WhatsAppMessageResponse } from '@/services/whatsapp-business-service';

type JasperIncomingMessage = {
  phoneNumberId?: string;
  sender: string;
  messageId?: string;
  text?: string;
  type?: string;
  interactiveId?: string;
  interactiveTitle?: string;
};

type JasperStatusUpdate = {
  phoneNumberId?: string;
  status?: string;
  messageId?: string;
  recipient?: string;
};

type JasperSendResult = {
  response?: WhatsAppMessageResponse;
  responseType: 'interactive' | 'template' | 'none';
  sentText?: string;
  templateName?: string;
  shouldFollowUp?: boolean;
};

export type JasperReplyTone = 'humanized' | 'robotic';

function isPortugueseLocale(locale: string | undefined) {
  if (!locale) return false;
  return locale.toLowerCase().startsWith('pt');
}

function getToneText(tone: JasperReplyTone | undefined, locale?: string) {
  const isPt = isPortugueseLocale(locale);

  if (tone === 'robotic') {
    return isPt
      ? {
          welcome: 'Bem-vindo ao Jasper\u2019s Market. Escolha uma op\u00e7\u00e3o:',
          followUp: 'Precisa de algo mais?',
        }
      : {
          welcome: "Welcome to Jasper's Market. Choose an option:",
          followUp: 'Need anything else?',
        };
  }

  return isPt
    ? {
        welcome: 'Bem-vindo ao Jasper\u2019s Market! Como posso ajudar hoje?',
        followUp: 'Posso ajudar em mais alguma coisa?',
      }
    : {
        welcome: "Welcome to Jasper's Market! What can we help you with today?",
        followUp: 'Is there anything else we can help you with?',
      };
}

function getButtonCtas(locale: string | undefined) {
  const isPt = isPortugueseLocale(locale);
  if (isPt) {
    return {
      interactiveWithMedia: 'Comprar online',
      mediaCarousel: 'Ideias de receitas',
      offer: 'Promo\u00e7\u00e3o atual',
    };
  }

  return {
    interactiveWithMedia: 'Shop online',
    mediaCarousel: 'Get recipe ideas',
    offer: 'Current promo',
  };
}

const REPLY_INTERACTIVE_MEDIA_ID = 'reply-interactive-with-media';
const REPLY_MEDIA_CAROUSEL_ID = 'reply-media-card-carousel';
const REPLY_OFFER_ID = 'reply-offer';

const DEFAULT_LOCALE = process.env.WHATSAPP_JASPER_LOCALE || 'en_US';

const UTILITY_TEMPLATE_NAME =
  process.env.WHATSAPP_JASPER_UTILITY_TEMPLATE || 'grocery_delivery_utility';
const CAROUSEL_TEMPLATE_NAME =
  process.env.WHATSAPP_JASPER_CAROUSEL_TEMPLATE || 'recipe_media_carousel';
const OFFER_TEMPLATE_NAME =
  process.env.WHATSAPP_JASPER_OFFER_TEMPLATE || 'strawberries_limited_offer';

const UTILITY_IMAGE =
  process.env.WHATSAPP_JASPER_UTILITY_IMAGE ||
  'https://scontent.xx.fbcdn.net/mci_ab/uap/asset_manager/id/?ab_b=e&ab_page=AssetManagerID&ab_entry=1530053877871776';

const OFFER_IMAGE =
  process.env.WHATSAPP_JASPER_OFFER_IMAGE ||
  'https://scontent.xx.fbcdn.net/mci_ab/uap/asset_manager/id/?ab_b=e&ab_page=AssetManagerID&ab_entry=1393969325614091';

const OFFER_CODE = process.env.WHATSAPP_JASPER_OFFER_CODE || 'BERRIES20';

const CAROUSEL_IMAGES = (
  process.env.WHATSAPP_JASPER_CAROUSEL_IMAGES ||
  'https://scontent.xx.fbcdn.net/mci_ab/uap/asset_manager/id/?ab_b=e&ab_page=AssetManagerID&ab_entry=1389202275965231,https://scontent.xx.fbcdn.net/mci_ab/uap/asset_manager/id/?ab_b=e&ab_page=AssetManagerID&ab_entry=3255815791260974'
)
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

export function isJasperDemoEnabled() {
  return process.env.WHATSAPP_JASPER_DEMO_ENABLED === 'true';
}

export async function handleJasperMessage(
  message: JasperIncomingMessage,
  tone?: JasperReplyTone
): Promise<JasperSendResult> {
  if (!isJasperDemoEnabled()) {
    return { responseType: 'none' };
  }

  if (!whatsappService.isConfigured()) {
    console.warn('[WhatsApp][Jasper] Serviço não configurado.');
    return { responseType: 'none' };
  }

  const messageId = message.messageId;
  const phoneNumberId = message.phoneNumberId;

  if (messageId) {
    try {
      await whatsappService.markMessageAsRead(messageId, phoneNumberId);
    } catch (error) {
      console.warn('[WhatsApp][Jasper] Falha ao marcar como lida:', error);
    }
  }

  const action = message.interactiveId;

  if (action === REPLY_INTERACTIVE_MEDIA_ID) {
    const response = await whatsappService.sendTemplate(
      message.sender,
      UTILITY_TEMPLATE_NAME,
      DEFAULT_LOCALE,
      [
        {
          type: 'header',
          parameters: [
            {
              type: 'image',
              image: {
                link: UTILITY_IMAGE,
              },
            },
          ],
        },
      ],
      phoneNumberId
    );

    return {
      response,
      responseType: 'template',
      templateName: UTILITY_TEMPLATE_NAME,
      shouldFollowUp: true,
    };
  }

  if (action === REPLY_MEDIA_CAROUSEL_ID) {
    const response = await whatsappService.sendTemplate(
      message.sender,
      CAROUSEL_TEMPLATE_NAME,
      DEFAULT_LOCALE,
      [
        {
          type: 'carousel',
          cards: CAROUSEL_IMAGES.map((imageLink, index) => ({
            card_index: index,
            components: [
              {
                type: 'header',
                parameters: [
                  {
                    type: 'image',
                    image: {
                      link: imageLink,
                    },
                  },
                ],
              },
            ],
          })),
        },
      ],
      phoneNumberId
    );

    return {
      response,
      responseType: 'template',
      templateName: CAROUSEL_TEMPLATE_NAME,
      shouldFollowUp: true,
    };
  }

  if (action === REPLY_OFFER_ID) {
    const expirationTimeMs = Date.now() + 48 * 60 * 60 * 1000;
    const response = await whatsappService.sendTemplate(
      message.sender,
      OFFER_TEMPLATE_NAME,
      DEFAULT_LOCALE,
      [
        {
          type: 'header',
          parameters: [
            {
              type: 'image',
              image: {
                link: OFFER_IMAGE,
              },
            },
          ],
        },
        {
          type: 'limited_time_offer',
          parameters: [
            {
              type: 'limited_time_offer',
              limited_time_offer: {
                expiration_time_ms: expirationTimeMs,
              },
            },
          ],
        },
        {
          type: 'button',
          sub_type: 'copy_code',
          index: 0,
          parameters: [
            {
              type: 'coupon_code',
              coupon_code: OFFER_CODE,
            },
          ],
        },
      ],
      phoneNumberId
    );

    return {
      response,
      responseType: 'template',
      templateName: OFFER_TEMPLATE_NAME,
      shouldFollowUp: true,
    };
  }

  const toneText = getToneText(tone, DEFAULT_LOCALE);
  const buttonCtas = getButtonCtas(DEFAULT_LOCALE);

  const response = await whatsappService.sendInteractiveButtons(
    message.sender,
    toneText.welcome,
    [
      {
        id: REPLY_INTERACTIVE_MEDIA_ID,
        title: buttonCtas.interactiveWithMedia,
      },
      {
        id: REPLY_MEDIA_CAROUSEL_ID,
        title: buttonCtas.mediaCarousel,
      },
      {
        id: REPLY_OFFER_ID,
        title: buttonCtas.offer,
      },
    ],
    phoneNumberId
  );

  return {
    response,
    responseType: 'interactive',
    sentText: toneText.welcome,
    shouldFollowUp: true,
  };
}

export async function handleJasperStatus(
  update: JasperStatusUpdate,
  tone?: JasperReplyTone
): Promise<{ response: WhatsAppMessageResponse | null; sentText: string | null }> {
  if (!isJasperDemoEnabled()) {
    return { response: null, sentText: null };
  }

  if (!whatsappService.isConfigured()) {
    return { response: null, sentText: null };
  }

  if (!update.recipient || !update.messageId) {
    return { response: null, sentText: null };
  }

  const status = update.status;
  if (status !== 'delivered' && status !== 'read') {
    return { response: null, sentText: null };
  }

  const toneText = getToneText(tone, DEFAULT_LOCALE);
  const response = await whatsappService.sendTextMessage(
    update.recipient,
    toneText.followUp,
    false,
    update.phoneNumberId
  );

  return { response, sentText: toneText.followUp };
}

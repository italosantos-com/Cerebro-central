export type LocalizationEntry = {
  id: string;
  defaultText: string;
  description?: string;
  /**
   * Optional hard cap (characters) for translated text.
   * Useful for UI elements like buttons to avoid layout breakage.
   */
  maxLength?: number;
};

export const LOCALIZATION_ENTRIES: LocalizationEntry[] = [
  {
    id: 'cta.primary',
    defaultText: 'Inscreva-se',
    description: 'Botão principal de cadastro no herói',
    maxLength: 24,
  },
  {
    id: 'cta.subtitle',
    defaultText: 'Apple • Face ID • Google',
    description: 'Subtítulo logo abaixo do botão de cadastro',
    maxLength: 48,
  },
  {
    id: 'pricing.planLabel',
    defaultText: 'Assinatura Mensal',
    description: 'Título da seção de preço principal',
    maxLength: 32,
  },
  {
    id: 'cta.loginRequired',
    defaultText: '🔐 Fazer Login para Assinar',
    description: 'Botão que solicita login antes de assinar',
    maxLength: 40,
  },
  {
    id: 'cta.loginButton',
    defaultText: 'Entrar',
    description: 'Botão secundário que abre o modal de login',
    maxLength: 24,
  },
  {
    id: 'security.title',
    defaultText: '100% Seguro & Protegido',
    description: 'Título do selo de segurança',
    maxLength: 40,
  },
  {
    id: 'security.subtitle',
    defaultText: 'SSL Certificado • Dados Criptografados',
    description: 'Descrição do selo de segurança',
    maxLength: 64,
  },
];

export const LOCALIZATION_ENTRY_MAP = LOCALIZATION_ENTRIES.reduce<Record<string, LocalizationEntry>>(
  (acc, entry) => {
    acc[entry.id] = entry;
    return acc;
  },
  {}
);

export function getDefaultText(id: string, fallback = ''): string {
  return LOCALIZATION_ENTRY_MAP[id]?.defaultText ?? fallback;
}

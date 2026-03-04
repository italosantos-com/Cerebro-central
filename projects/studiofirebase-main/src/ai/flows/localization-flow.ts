'use server';
/**
 * @file localization-flow.ts
 * Flow orquestrado que combina detecção de idioma, tradução opcional de labels
 * e conversão de moeda em uma única chamada Genkit para inicializar a UI.
 *
 * Responsabilidades:
 *  - Detectar idioma do usuário (opcional: se já vier do cliente, reutiliza)
 *  - Converter valor base (BRL) para moeda do locale
 *  - Produzir labels traduzidos mínimos (ex: "Assinatura Mensal")
 *  - Retornar estrutura pronta para frontend inicializar paymentInfo + texts
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Idioma → Moeda padrão (simplificado; pode ser expandido)
const localeCurrencyMap: Record<string, { currency: string; symbol: string }> = {
  'pt': { currency: 'BRL', symbol: 'R$' },
  'pt-br': { currency: 'BRL', symbol: 'R$' },
  'en': { currency: 'USD', symbol: '$' },
  'en-us': { currency: 'USD', symbol: '$' },
  'en-gb': { currency: 'GBP', symbol: '£' },
  'es': { currency: 'EUR', symbol: '€' },
  'fr': { currency: 'EUR', symbol: '€' },
  'de': { currency: 'EUR', symbol: '€' },
  'it': { currency: 'EUR', symbol: '€' },
  'ja': { currency: 'JPY', symbol: '¥' },
  'ko': { currency: 'KRW', symbol: '₩' },
  'zh': { currency: 'CNY', symbol: '¥' },
  'ru': { currency: 'RUB', symbol: '₽' },
  'ar': { currency: 'USD', symbol: '$' }, // fallback
};

const LocalizationInputSchema = z.object({
  baseAmountBRL: z.number().default(99.00),
  explicitLocale: z.string().optional().describe('Locale detectado no cliente (ex: navigator.language).'),
  translate: z.boolean().default(true),
});
export type LocalizationInput = z.infer<typeof LocalizationInputSchema>;

const LocalizationOutputSchema = z.object({
  language: z.string(),
  currencyCode: z.string(),
  currencySymbol: z.string(),
  convertedAmount: z.number(),
  labels: z.object({
    subscriptionMonthly: z.string(),
    payWithPaypal: z.string(),
    payWithPix: z.string(),
  }),
});
export type LocalizationOutput = z.infer<typeof LocalizationOutputSchema>;

// Util simples para arredondar com 2 casas
function round2(n: number) {
  return Math.round(n * 100) / 100;
}

const localizationFlow = ai.defineFlow(
  {
    name: 'localizationFlow',
    inputSchema: LocalizationInputSchema,
    outputSchema: LocalizationOutputSchema,
  },
  async (input: LocalizationInput): Promise<LocalizationOutput> => {
    const { baseAmountBRL, explicitLocale, translate } = input;

    // 1. Detectar idioma (simples: usar explicitLocale ou fallback 'pt-BR')
    const rawLocale = explicitLocale?.toLowerCase() || 'pt-br';

    // Normalizar para chave principal (ex: en-us → en-us, en → en)
    const localeKey = Object.keys(localeCurrencyMap).find(k => rawLocale.startsWith(k)) || 'pt-br';
    const { currency, symbol } = localeCurrencyMap[localeKey];

    // 2. Converter moeda via IA (Gemini) apenas se não for BRL
    let convertedAmount = baseAmountBRL;
    if (currency !== 'BRL') {
      const prompt = `Converta ${baseAmountBRL} BRL para ${currency}. Apenas retorne o valor numérico com duas casas decimais.`;
      try {
        const { output } = await ai.generate({
          prompt,
          model: 'googleai/gemini-2.0-flash',
          output: { format: 'text' },
          config: { temperature: 0.1 },
        });
        const parsed = parseFloat(String(output).replace(/[^0-9.,]/g, '').replace(',', '.'));
        if (Number.isFinite(parsed) && parsed > 0) {
          convertedAmount = round2(parsed);
        }
      } catch {
        // Fallback mantém BRL convertido logicamente (sem taxa real)
        convertedAmount = round2(baseAmountBRL * 0.20); // suposição simplificada: 1 BRL = 0.20 unidade moeda
      }
    }

    // 3. Labels traduzidos via IA se translate = true e idioma diferente de pt
    const baseLabels = {
      subscriptionMonthly: 'Assinatura Mensal',
      payWithPaypal: 'Pagar com PayPal',
      payWithPix: 'Pagar com PIX',
    };

    let labels = baseLabels;
    if (translate && !localeKey.startsWith('pt')) {
      const translationPrompt = `Traduza cada label para o idioma '${localeKey}' mantendo significado comercial. Formato JSON:
{
  "subscriptionMonthly": "...",
  "payWithPaypal": "...",
  "payWithPix": "..."
}`;
      try {
        const { output } = await ai.generate({
          prompt: translationPrompt,
          model: 'googleai/gemini-2.0-flash',
          output: { format: 'json' },
          config: { temperature: 0.2 },
        });
        labels = { ...labels, ...(output as any) };
      } catch {
        // Mantém labels originais em caso de falha
      }
    }

    return {
      language: localeKey,
      currencyCode: currency,
      currencySymbol: symbol,
      convertedAmount: convertedAmount,
      labels,
    };
  }
);

export async function initializeLocalization(input: LocalizationInput): Promise<LocalizationOutput> {
  return localizationFlow(input);
}

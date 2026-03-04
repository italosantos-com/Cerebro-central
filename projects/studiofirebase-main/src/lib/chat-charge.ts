export function getChargeAmountFromMessage(message: { chargeAmount?: number; text?: string }): number | null {
  if (typeof message.chargeAmount === 'number' && Number.isFinite(message.chargeAmount) && message.chargeAmount > 0) {
    return message.chargeAmount;
  }

  if (!message.text) {
    return null;
  }

  const match = message.text.match(/R\$\s*([0-9]+(?:[.,][0-9]{2})?)/i);
  if (!match?.[1]) {
    return null;
  }

  const normalized = match[1].replace(',', '.');
  const parsed = Number.parseFloat(normalized);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

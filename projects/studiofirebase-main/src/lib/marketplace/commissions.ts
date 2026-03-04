export const PLATFORM_FEE_PERCENTAGE = 0.15; // 15%

export function calculateCommission(amount: number) {
  // Trabalhar sempre com inteiros se possível, mas aqui retorna float para visualização
  const platformFee = amount * PLATFORM_FEE_PERCENTAGE;
  const sellerAmount = amount - platformFee;

  return {
    platformFee: Number(platformFee.toFixed(2)),
    sellerAmount: Number(sellerAmount.toFixed(2)),
  };
}

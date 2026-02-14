export interface PriceCalculationInput {
  ptContent: number; // g/kg
  pdContent: number; // g/kg
  rhContent: number; // g/kg
  ptSpotPrice: number; // per troy oz
  pdSpotPrice: number; // per troy oz
  rhSpotPrice: number; // per troy oz
  recoveryPt: number; // percentage (0-100)
  recoveryPd: number; // percentage (0-100)
  recoveryRh: number; // percentage (0-100)
  weight: number; // kg
  discount: number; // percentage (0-100)
}

const TROY_OZ_PER_GRAM = 1 / 31.1035;

export function calculateConverterPrice(input: PriceCalculationInput) {
  const ptPricePerGram = input.ptSpotPrice * TROY_OZ_PER_GRAM;
  const pdPricePerGram = input.pdSpotPrice * TROY_OZ_PER_GRAM;
  const rhPricePerGram = input.rhSpotPrice * TROY_OZ_PER_GRAM;

  const ptValue = input.ptContent * input.weight * ptPricePerGram * (input.recoveryPt / 100);
  const pdValue = input.pdContent * input.weight * pdPricePerGram * (input.recoveryPd / 100);
  const rhValue = input.rhContent * input.weight * rhPricePerGram * (input.recoveryRh / 100);

  const grossValue = ptValue + pdValue + rhValue;
  const discountAmount = grossValue * (input.discount / 100);
  const finalPrice = grossValue - discountAmount;

  return {
    ptValue: Math.round(ptValue * 100) / 100,
    pdValue: Math.round(pdValue * 100) / 100,
    rhValue: Math.round(rhValue * 100) / 100,
    grossValue: Math.round(grossValue * 100) / 100,
    discount: Math.round(discountAmount * 100) / 100,
    finalPrice: Math.round(finalPrice * 100) / 100,
  };
}

export function parseDecimalString(value: string): number {
  if (!value || value.trim() === '') return 0;
  return parseFloat(value.replace(',', '.')) || 0;
}

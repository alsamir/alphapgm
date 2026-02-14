import { z } from 'zod';

export const pricePercentageSchema = z.object({
  pt: z.number().min(0).max(100),
  pd: z.number().min(0).max(100),
  rh: z.number().min(0).max(100),
});

export type PricePercentageInput = z.infer<typeof pricePercentageSchema>;

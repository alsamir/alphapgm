import { z } from 'zod';

export const creditTopupSchema = z.object({
  quantity: z.number().int().min(1).max(10),
});

export type CreditTopupInput = z.infer<typeof creditTopupSchema>;

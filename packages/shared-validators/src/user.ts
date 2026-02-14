import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional(),
});

export const updateSettingsSchema = z.object({
  discount: z.number().int().min(0).max(100).optional(),
  currencyId: z.number().int().positive().optional(),
  restDiscount: z.boolean().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

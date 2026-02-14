import { z } from 'zod';

export const converterSearchSchema = z.object({
  query: z.string().max(200).optional(),
  brand: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  sortBy: z.enum(['name', 'brand', 'price']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const converterCreateSchema = z.object({
  name: z.string().min(1).max(500),
  nameModified: z.string().max(500).optional(),
  urlPath: z.string().max(500).optional(),
  brand: z.string().min(1).max(200),
  weight: z.string().max(50).optional(),
  pt: z.string().max(50).optional(),
  pd: z.string().max(50).optional(),
  rh: z.string().max(50).optional(),
  keywords: z.string().max(1000).optional(),
  imageUrl: z.string().max(500).optional(),
  brandImage: z.string().max(255).optional(),
});

export const converterUpdateSchema = converterCreateSchema.partial();

export type ConverterSearchInput = z.infer<typeof converterSearchSchema>;
export type ConverterCreateInput = z.infer<typeof converterCreateSchema>;
export type ConverterUpdateInput = z.infer<typeof converterUpdateSchema>;

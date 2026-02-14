import { z } from 'zod';

export const aiChatSchema = z.object({
  message: z.string().min(1, 'Message is required').max(2000, 'Message is too long'),
  chatId: z.number().int().positive().optional(),
});

export type AiChatInput = z.infer<typeof aiChatSchema>;

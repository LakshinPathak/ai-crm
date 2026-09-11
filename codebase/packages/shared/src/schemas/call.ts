import { z } from 'zod';

export const PatchCallSchema = z.object({
  dealId: z.string().min(1).nullable(),
});

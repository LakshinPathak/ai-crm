import type { Request, Response } from 'express';
import { z } from 'zod';
import { MarketingLead } from '@ai-crm/db';

const LeadSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  company: z.string().optional(),
  source: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function createLead(req: Request, res: Response) {
  const parsed = LeadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    return;
  }

  const lead = await MarketingLead.create(parsed.data);
  res.status(201).json({ id: lead.id, email: lead.email });
}

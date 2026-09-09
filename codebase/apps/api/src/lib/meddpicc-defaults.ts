export const MEDDPICC_LETTERS = ['M', 'E', 'D1', 'D2', 'P', 'I', 'C1', 'C2'] as const;

export function buildDefaultMeddpicc(dealTitle: string) {
  return {
    M: { label: 'Metrics', summary: `Quantified impact for ${dealTitle}: 30% faster sales cycle target.`, confidence: 0.75 },
    E: { label: 'Economic Buyer', summary: 'VP Sales identified; budget holder confirmation pending.', confidence: 0.6 },
    D1: { label: 'Decision Criteria', summary: 'Security, CRM integration, and MEDDPICC automation are top criteria.', confidence: 0.7 },
    D2: { label: 'Decision Process', summary: 'Pilot → security review → procurement; ~6 weeks.', confidence: 0.65 },
    P: { label: 'Paper Process', summary: 'Standard MSA; legal review expected in final stage.', confidence: 0.5 },
    I: { label: 'Identify Pain', summary: 'Reps lack unified deal context; manual MEDDPICC in spreadsheets.', confidence: 0.85 },
    C1: { label: 'Champion', summary: 'Director of Sales Ops actively sponsoring evaluation.', confidence: 0.8 },
    C2: { label: 'Competition', summary: 'Incumbent CRM add-ons and point-solution AI tools.', confidence: 0.55 },
  };
}

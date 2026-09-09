import { Schema, model } from 'mongoose';

const MarketingLeadSchema = new Schema(
  {
    email: { type: String, required: true },
    company: String,
    name: String,
    source: { type: String, default: 'pricing_wizard' },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export const MarketingLead = model('MarketingLead', MarketingLeadSchema);

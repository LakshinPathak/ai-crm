/** Dummy records for HubSpot Free tier seed (1 pipeline, batch-friendly). */

/** HubSpot `industry` property requires enum values (not free text). */
export const SEED_COMPANIES = [
  { name: 'TechVentures Inc', domain: 'techventures.io', industry: 'COMPUTER_SOFTWARE' },
  { name: 'CloudSync LLC', domain: 'cloudsync.com', industry: 'INTERNET' },
  { name: 'DataPulse GmbH', domain: 'datapulse.de', industry: 'INFORMATION_SERVICES' },
  { name: 'Nimbus Retail', domain: 'nimbusretail.com', industry: 'RETAIL' },
  { name: 'Apex Manufacturing', domain: 'apexmfg.com', industry: 'MACHINERY' },
];

export const SEED_CONTACTS = [
  { email: 'sarah.chen@techventures.io', firstname: 'Sarah', lastname: 'Chen', jobtitle: 'VP Sales' },
  { email: 'mike.ross@cloudsync.com', firstname: 'Mike', lastname: 'Ross', jobtitle: 'Director IT' },
  { email: 'anna.mueller@datapulse.de', firstname: 'Anna', lastname: 'Mueller', jobtitle: 'Head of Ops' },
  { email: 'james.wong@nimbusretail.com', firstname: 'James', lastname: 'Wong', jobtitle: 'CFO' },
  { email: 'lisa.park@apexmfg.com', firstname: 'Lisa', lastname: 'Park', jobtitle: 'Plant Manager' },
];

export type SeedDeal = {
  name: string;
  amount: string;
  stageIndex: number;
  closeDate: string;
  companyIndex: number;
  contactIndex: number;
};

export const SEED_DEALS: SeedDeal[] = [
  { name: 'TechVentures — Platform License', amount: '95000', stageIndex: 2, closeDate: '2026-04-15', companyIndex: 0, contactIndex: 0 },
  { name: 'CloudSync — Enterprise Rollout', amount: '210000', stageIndex: 3, closeDate: '2026-03-30', companyIndex: 1, contactIndex: 1 },
  { name: 'DataPulse — EMEA Expansion', amount: '58000', stageIndex: 1, closeDate: '2026-05-01', companyIndex: 2, contactIndex: 2 },
  { name: 'Nimbus — POS Integration', amount: '34000', stageIndex: 0, closeDate: '2026-06-10', companyIndex: 3, contactIndex: 3 },
  { name: 'Apex — Plant Automation', amount: '175000', stageIndex: 3, closeDate: '2026-03-20', companyIndex: 4, contactIndex: 4 },
];

export const SEED_TASKS = [
  { subject: 'Send revised proposal', body: 'Include security appendix and pricing tiers.', status: 'NOT_STARTED' },
  { subject: 'Schedule discovery call', body: 'Align with economic buyer calendar.', status: 'NOT_STARTED' },
  { subject: 'Legal review follow-up', body: 'Chase MSA redlines from customer legal.', status: 'IN_PROGRESS' },
  { subject: 'Demo prep — integration', body: 'Prepare CRM + API demo environment.', status: 'NOT_STARTED' },
  { subject: 'Post-call summary', body: 'Log MEDDPICC notes after champion call.', status: 'COMPLETED' },
];

export const SEED_NOTES = [
  'Champion confirmed budget for Q3. Strong fit on security requirements.',
  'HubSpot sync test — deal moved to proposal after successful pilot.',
  'Waiting on legal review of BAA. Economic buyer engaged.',
  'Discovery call scheduled — pain around manual MEDDPICC in spreadsheets.',
  'Verbal yes pending signature. CFO approved pilot budget.',
];

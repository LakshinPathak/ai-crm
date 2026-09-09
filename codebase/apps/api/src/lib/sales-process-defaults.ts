/** Default presales process definitions (orthogonal to CRM pipeline stages). */
export const DEFAULT_SALES_PROCESSES = [
  {
    id: 'default-presales',
    name: 'Default Presales Process',
    isDefault: true,
    stages: [
      {
        id: 'on-deck',
        name: 'On Deck',
        position: 0,
        milestones: [
          { id: 'on-deck-stakeholders', title: 'Map stakeholders', position: 0 },
          { id: 'on-deck-fit', title: 'Qualify technical fit', position: 1 },
          { id: 'on-deck-pain', title: 'Confirm pain and urgency', position: 2 },
        ],
      },
      {
        id: 'success-planning',
        name: 'Success Planning',
        position: 1,
        milestones: [
          { id: 'success-criteria', title: 'Define success criteria', position: 0 },
          { id: 'success-timeline', title: 'Align on timeline and resources', position: 1 },
          { id: 'success-champion', title: 'Identify champion', position: 2 },
        ],
      },
      {
        id: 'technical-validation',
        name: 'Technical Validation',
        position: 2,
        milestones: [
          { id: 'tech-sandbox', title: 'Provision sandbox or environment', position: 0 },
          { id: 'tech-test-cases', title: 'Execute technical test cases', position: 1 },
          { id: 'tech-security', title: 'Complete security review', position: 2 },
          { id: 'tech-integration', title: 'Validate integrations', position: 3 },
        ],
      },
      {
        id: 'business-outcomes',
        name: 'Business Outcomes',
        position: 3,
        milestones: [
          { id: 'business-roi', title: 'Validate ROI metrics', position: 0 },
          { id: 'business-eb', title: 'Engage economic buyer', position: 1 },
          { id: 'business-outcomes-doc', title: 'Document quantified outcomes', position: 2 },
        ],
      },
      {
        id: 'tech-win',
        name: 'Tech Win',
        position: 4,
        milestones: [
          { id: 'tech-win-confirm', title: 'Confirm technical win', position: 0 },
          { id: 'tech-win-architecture', title: 'Reference architecture sign-off', position: 1 },
          { id: 'tech-win-handoff', title: 'Hand off to commercial close', position: 2 },
        ],
      },
    ],
  },
];

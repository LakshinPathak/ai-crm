import { Types } from 'mongoose';
import { MeddpiccCitation } from '@ai-crm/db';
import { buildDefaultMeddpicc, MEDDPICC_LETTERS } from './meddpicc-defaults.js';

type MeddpiccLetters = ReturnType<typeof buildDefaultMeddpicc>;

type MeddpiccSection = MeddpiccLetters[keyof MeddpiccLetters] & {
  artifactId?: string;
  excerpt?: string;
};

export async function upsertMeddpiccCitations(params: {
  workspaceId: Types.ObjectId | string;
  dealId: Types.ObjectId | string;
  letters: MeddpiccLetters;
}): Promise<void> {
  const { workspaceId, dealId, letters } = params;

  await Promise.all(
    MEDDPICC_LETTERS.map(async (letter) => {
      const section = letters[letter] as MeddpiccSection | undefined;
      if (!section?.summary) return;

      const update: Record<string, unknown> = {
        workspaceId,
        dealId,
        letter,
        claimKey: 'summary',
        text: section.summary,
        excerpt: section.excerpt ?? section.summary,
        confidence: section.confidence,
      };

      if (section.artifactId && Types.ObjectId.isValid(section.artifactId)) {
        update.artifactId = section.artifactId;
      }

      await MeddpiccCitation.findOneAndUpdate(
        { workspaceId, dealId, letter, claimKey: 'summary' },
        update,
        { upsert: true },
      );
    }),
  );
}

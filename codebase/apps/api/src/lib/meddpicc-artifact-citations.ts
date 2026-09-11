import type { ArtifactChunkSearchHit } from './artifact-chunk-search.js';
import { searchArtifactChunks } from './artifact-chunk-search.js';
import { buildDefaultMeddpicc, MEDDPICC_LETTERS } from './meddpicc-defaults.js';

export type MeddpiccLetters = ReturnType<typeof buildDefaultMeddpicc>;

export type MeddpiccLetterSection = MeddpiccLetters[keyof MeddpiccLetters] & {
  artifactId?: string;
  chunkId?: string;
  excerpt?: string;
};

const EXCERPT_MAX = 280;
const CHUNKS_PER_LETTER = 3;

const LETTER_SEARCH_QUERIES: Record<(typeof MEDDPICC_LETTERS)[number], string> = {
  M: 'metrics ROI quantified outcomes business value KPI',
  E: 'economic buyer budget CFO procurement sign-off',
  D1: 'decision criteria evaluation requirements must have',
  D2: 'decision process approval workflow stakeholders timeline',
  P: 'paper process legal MSA contract procurement',
  I: 'pain problem challenge frustration need',
  C1: 'champion internal sponsor advocate',
  C2: 'competition competitor alternative incumbent',
};

export function excerptFromText(text: string, max = EXCERPT_MAX): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export async function fetchMeddpiccArtifactChunksByLetter(
  workspaceId: string,
  dealId: string,
): Promise<Map<string, ArtifactChunkSearchHit[]>> {
  const entries = await Promise.all(
    MEDDPICC_LETTERS.map(async (letter) => {
      const hits = await searchArtifactChunks(
        workspaceId,
        dealId,
        LETTER_SEARCH_QUERIES[letter],
        CHUNKS_PER_LETTER,
      );
      return [letter, hits] as const;
    }),
  );

  return new Map(entries);
}

export function formatMeddpiccArtifactPromptBlock(
  chunksByLetter: Map<string, ArtifactChunkSearchHit[]>,
  letters: MeddpiccLetters,
): string {
  const blocks: string[] = [];

  for (const letter of MEDDPICC_LETTERS) {
    const hits = chunksByLetter.get(letter);
    if (!hits?.length) continue;
    const label = letters[letter]?.label ?? letter;
    blocks.push(`### ${letter} — ${label}`);
    for (const hit of hits) {
      blocks.push(`[chunkId: ${hit._id.toString()}]\n${hit.text.trim()}`);
    }
  }

  if (blocks.length === 0) return '';

  return `\nArtifact excerpts for this deal (ground summaries in these when relevant; set chunkId to a matching id and excerpt to a short quote):\n\n${blocks.join('\n\n')}`;
}

/**
 * Attach chunkId / artifactId / excerpt on letter sections when artifact search returned hits.
 */
export function attachChunkCitationsToLetters(
  letters: MeddpiccLetters,
  chunksByLetter: Map<string, ArtifactChunkSearchHit[]>,
): MeddpiccLetters {
  const merged = { ...letters };

  for (const letter of MEDDPICC_LETTERS) {
    const hits = chunksByLetter.get(letter);
    if (!hits?.length) continue;

    const hitById = new Map(hits.map((h) => [h._id.toString(), h]));
    const section: MeddpiccLetterSection = { ...merged[letter] };

    let hit: ArtifactChunkSearchHit | undefined;
    const preferredId = section.chunkId?.trim();
    if (preferredId && hitById.has(preferredId)) {
      hit = hitById.get(preferredId);
    } else {
      hit = hits[0];
    }

    if (!hit?.text?.trim()) continue;

    section.chunkId = hit._id.toString();
    section.artifactId = hit.artifactId.toString();
    section.excerpt = section.excerpt?.trim()
      ? excerptFromText(section.excerpt)
      : excerptFromText(hit.text);

    merged[letter] = section;
  }

  return merged;
}

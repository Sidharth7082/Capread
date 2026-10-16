import { getNovelChapters } from '@database/queries/ChapterQueries';
import { getNovelById } from '@database/queries/NovelQueries';
import { upsertNovelRecap } from '@database/queries/RecapQueries';
import { createChatCompletion, type AiChatConfig } from './client';
import { getChapterPlainText } from './chapterText';
import { truncateText } from './text';

export { htmlToPlainText, normalizeWhitespace, truncateText } from './text';

export const MAX_RECAP_CHAPTERS = 60;
export const CHAPTER_TEXT_CHAR_CAP = 4000;
export const BATCH_CHAR_BUDGET = 20000;

export type RecapSourceChapter = {
  id: number;
  name: string;
  text: string;
};

export type RecapProgress = {
  completedSteps: number;
  totalSteps: number;
};

export type RecapResult = {
  summary: string;
  upToChapterId: number;
  chaptersCovered: number;
};

/**
 * Picks the most recent read chapters and splits them into batches that fit
 * the request character budget. Empty chapters are dropped.
 */
export const chunkRecapChapters = (
  chapters: RecapSourceChapter[],
  options: {
    maxChapters?: number;
    perChapterCap?: number;
    batchCharBudget?: number;
  } = {},
): RecapSourceChapter[][] => {
  const maxChapters = options.maxChapters ?? MAX_RECAP_CHAPTERS;
  const perChapterCap = options.perChapterCap ?? CHAPTER_TEXT_CHAR_CAP;
  const batchCharBudget = options.batchCharBudget ?? BATCH_CHAR_BUDGET;

  const batches: RecapSourceChapter[][] = [];
  let currentBatch: RecapSourceChapter[] = [];
  let currentChars = 0;

  for (const chapter of chapters.slice(-maxChapters)) {
    const text = truncateText(chapter.text.trim(), perChapterCap);
    if (!text) {
      continue;
    }
    if (currentBatch.length && currentChars + text.length > batchCharBudget) {
      batches.push(currentBatch);
      currentBatch = [];
      currentChars = 0;
    }
    currentBatch.push({ ...chapter, text });
    currentChars += text.length;
  }

  if (currentBatch.length) {
    batches.push(currentBatch);
  }

  return batches;
};

const formatChapters = (chapters: RecapSourceChapter[]): string =>
  chapters.map(chapter => `## ${chapter.name}\n${chapter.text}`).join('\n\n');

export const buildNotesPrompt = (
  novelName: string,
  chapters: RecapSourceChapter[],
) => ({
  system: `You extract story notes from light novel chapters. You receive consecutive chapter excerpts from "${novelName}". Write compact notes covering key events, characters and unresolved plot threads. Use the same language as the excerpts. Only use information present in the excerpts.`,
  user: formatChapters(chapters),
});

export const buildRecapPrompt = (novelName: string, sourceText: string) => ({
  system: `You write "Previously on..." recaps for a reader returning to the light novel "${novelName}". From the provided material, write a short recap (up to ~150 words) in the same language as the material: the most important recent events and the current situation. Plain prose, no lists or headings, no spoilers beyond the material.`,
  user: sourceText,
});

export type GenerateRecapParams = {
  novelId: number;
  /**
   * Recap covers read chapters that come before this chapter. When omitted,
   * every read chapter of the novel is covered.
   */
  upToChapterId?: number;
  config: AiChatConfig;
  onProgress?: (progress: RecapProgress) => void;
};

/**
 * Builds (and caches) a "previously on" recap for a novel from its read
 * chapters. Long chapter lists are summarized in batches and reduced into a
 * single recap.
 */
export const generateNovelRecap = async ({
  novelId,
  upToChapterId,
  config,
  onProgress,
}: GenerateRecapParams): Promise<RecapResult> => {
  const novel = getNovelById(novelId);
  if (!novel) {
    throw new Error('Novel not found');
  }

  const chapters = await getNovelChapters(novelId);
  const targetIndex =
    upToChapterId != null
      ? chapters.findIndex(chapter => chapter.id === upToChapterId)
      : chapters.length;

  const candidateChapters = (
    targetIndex === -1 ? chapters : chapters.slice(0, targetIndex)
  ).filter(chapter => chapter.readTime);

  if (!candidateChapters.length) {
    throw new Error('No read chapters to recap yet');
  }

  const sources: RecapSourceChapter[] = [];
  for (const chapter of candidateChapters) {
    const text = await getChapterPlainText(novel.pluginId, chapter);
    if (text) {
      sources.push({ id: chapter.id, name: chapter.name, text });
    }
  }

  if (!sources.length) {
    throw new Error('No readable text found in the read chapters');
  }

  const batches = chunkRecapChapters(sources);
  const totalSteps = batches.length === 1 ? 1 : batches.length + 1;
  let completedSteps = 0;
  onProgress?.({ completedSteps, totalSteps });

  let sourceText: string;
  if (batches.length === 1) {
    sourceText = formatChapters(batches[0]);
  } else {
    const notes: string[] = [];
    for (const batch of batches) {
      const { system, user } = buildNotesPrompt(novel.name, batch);
      notes.push(
        await createChatCompletion(config, [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ]),
      );
      completedSteps += 1;
      onProgress?.({ completedSteps, totalSteps });
    }
    sourceText = notes
      .map((note, index) => `Notes ${index + 1}:\n${note}`)
      .join('\n\n');
  }

  const recapPrompt = buildRecapPrompt(novel.name, sourceText);
  const summary = await createChatCompletion(config, [
    { role: 'system', content: recapPrompt.system },
    { role: 'user', content: recapPrompt.user },
  ]);
  completedSteps += 1;
  onProgress?.({ completedSteps, totalSteps });

  const upTo = sources[sources.length - 1].id;
  await upsertNovelRecap({
    novelId,
    summary,
    upToChapterId: upTo,
    chaptersCovered: sources.length,
    provider: config.baseUrl.trim(),
    model: config.model.trim(),
    updatedAt: new Date().toISOString(),
  });

  return { summary, upToChapterId: upTo, chaptersCovered: sources.length };
};

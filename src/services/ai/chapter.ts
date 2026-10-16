import { getNovelChapters } from '@database/queries/ChapterQueries';
import { getNovelById } from '@database/queries/NovelQueries';
import {
  appendChapterChatMessage,
  upsertChapterSummary,
} from '@database/queries/ChapterAiQueries';
import {
  createChatCompletion,
  type AiChatConfig,
  type AiChatMessage,
} from './client';
import { getChapterPlainText } from './chapterText';
import { truncateText } from './text';

export const DEFAULT_CONTEXT_CHARS = 16000;
export const DEFAULT_HISTORY_TURNS = 10;

export type ChapterAiTarget = {
  novelId: number;
  chapterId: number;
};

export type ChapterAiOptions = {
  /** Characters of chapter text sent as context. 0 means the whole chapter. */
  contextChars?: number;
  /** Previous chat turns included in the prompt. */
  historyTurns?: number;
};

export type ChapterChatTurn = {
  role: 'user' | 'assistant';
  content: string;
};

export type ChapterAiSource = {
  novelName: string;
  chapterName: string;
  text: string;
  truncated: boolean;
};

export const buildChapterSummaryPrompt = (
  novelName: string,
  chapterName: string,
  chapterText: string,
) => ({
  system: `You summarize light novel chapters. Summarize chapter "${chapterName}" of "${novelName}" in up to ~120 words: what happens, who appears and what changes. Use the same language as the chapter. Only use information from the provided text, plain prose, no spoilers for other chapters.`,
  user: chapterText,
});

export const buildChapterQuestionPrompt = (
  novelName: string,
  chapterName: string,
  chapterText: string,
  chapterTruncated: boolean,
) => ({
  system: `You answer questions about chapter "${chapterName}" of the light novel "${novelName}".${
    chapterTruncated
      ? ' The chapter text below is truncated, so state that you only see part of the chapter when the answer could be missing.'
      : ''
  }
Answer only from the chapter text below. If the answer is not in it, say that this chapter does not cover it instead of guessing. Quote short passages when helpful and keep answers brief. Reply in the language of the question.

CHAPTER TEXT:
${chapterText}`,
});

const resolveChapter = async ({
  novelId,
  chapterId,
}: ChapterAiTarget): Promise<{
  novelName: string;
  chapterName: string;
  pluginId: string;
  chapter: Awaited<ReturnType<typeof getNovelChapters>>[number];
}> => {
  const novel = getNovelById(novelId);
  if (!novel) {
    throw new Error('Novel not found');
  }

  const chapter = (await getNovelChapters(novelId)).find(
    item => item.id === chapterId,
  );
  if (!chapter) {
    throw new Error('Chapter not found');
  }

  return {
    novelName: novel.name,
    chapterName: chapter.name,
    pluginId: novel.pluginId,
    chapter,
  };
};

export const getChapterAiSource = async (
  target: ChapterAiTarget,
  options: ChapterAiOptions = {},
): Promise<ChapterAiSource> => {
  const { novelName, chapterName, pluginId, chapter } = await resolveChapter(
    target,
  );

  const text = (await getChapterPlainText(pluginId, chapter)).trim();
  if (!text) {
    throw new Error('This chapter has no readable text');
  }

  const contextChars = options.contextChars ?? DEFAULT_CONTEXT_CHARS;
  const truncated = contextChars > 0 && text.length > contextChars;

  return {
    novelName,
    chapterName,
    text: truncated ? truncateText(text, contextChars) : text,
    truncated,
  };
};

/**
 * Summarizes one chapter and caches the result for the chapter row.
 */
export const summarizeChapter = async (
  target: ChapterAiTarget,
  config: AiChatConfig,
  options: ChapterAiOptions = {},
): Promise<string> => {
  const source = await getChapterAiSource(target, options);
  const { system, user } = buildChapterSummaryPrompt(
    source.novelName,
    source.chapterName,
    source.text,
  );

  const summary = await createChatCompletion(config, [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]);

  await upsertChapterSummary({
    chapterId: target.chapterId,
    summary,
    provider: config.baseUrl.trim(),
    model: config.model.trim(),
    updatedAt: new Date().toISOString(),
  });

  return summary;
};

/**
 * Answers a question about one chapter. The previous turns are replayed for
 * follow-up questions; both the question and the answer are stored.
 */
export const askAboutChapter = async (
  target: ChapterAiTarget,
  question: string,
  history: ChapterChatTurn[],
  config: AiChatConfig,
  options: ChapterAiOptions = {},
): Promise<string> => {
  const trimmedQuestion = question.trim();
  if (!trimmedQuestion) {
    throw new Error('Question is empty');
  }

  const source = await getChapterAiSource(target, options);
  const { system } = buildChapterQuestionPrompt(
    source.novelName,
    source.chapterName,
    source.text,
    source.truncated,
  );

  const historyTurns = options.historyTurns ?? DEFAULT_HISTORY_TURNS;
  const previousTurns = historyTurns > 0 ? history.slice(-historyTurns) : [];
  const messages: AiChatMessage[] = [
    { role: 'system', content: system },
    ...previousTurns.map(turn => ({
      role: turn.role,
      content: turn.content,
    })),
    { role: 'user', content: trimmedQuestion },
  ];

  const answer = await createChatCompletion(config, messages, {
    temperature: 0.2,
  });

  const createdAt = new Date().toISOString();
  await appendChapterChatMessage({
    chapterId: target.chapterId,
    role: 'user',
    content: trimmedQuestion,
    createdAt,
  });
  await appendChapterChatMessage({
    chapterId: target.chapterId,
    role: 'assistant',
    content: answer,
    createdAt: new Date().toISOString(),
  });

  return answer;
};

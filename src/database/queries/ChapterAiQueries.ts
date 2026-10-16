import { asc, eq, inArray } from 'drizzle-orm';
import { dbManager } from '@database/db';
import {
  chapterChatMessageSchema,
  chapterSummarySchema,
  type ChapterChatMessageInsert,
  type ChapterChatMessageRow,
  type ChapterSummaryInsert,
  type ChapterSummaryRow,
} from '@database/schema';

export const getChapterSummary = async (
  chapterId: number,
): Promise<ChapterSummaryRow | undefined> => {
  return dbManager
    .select()
    .from(chapterSummarySchema)
    .where(eq(chapterSummarySchema.chapterId, chapterId))
    .get();
};

export const upsertChapterSummary = async (
  summary: ChapterSummaryInsert,
): Promise<void> => {
  await dbManager.write(async tx => {
    await tx
      .insert(chapterSummarySchema)
      .values(summary)
      .onConflictDoUpdate({
        target: chapterSummarySchema.chapterId,
        set: {
          summary: summary.summary,
          provider: summary.provider ?? null,
          model: summary.model ?? null,
          updatedAt: summary.updatedAt ?? null,
        },
      })
      .run();
  });
};

export const getChapterChatMessages = async (
  chapterId: number,
): Promise<ChapterChatMessageRow[]> => {
  return dbManager
    .select()
    .from(chapterChatMessageSchema)
    .where(eq(chapterChatMessageSchema.chapterId, chapterId))
    .orderBy(asc(chapterChatMessageSchema.id))
    .all();
};

export const appendChapterChatMessage = async (
  message: ChapterChatMessageInsert,
): Promise<void> => {
  await dbManager.write(async tx => {
    await tx.insert(chapterChatMessageSchema).values(message).run();
  });
};

export const clearChapterChatMessages = async (
  chapterId: number,
): Promise<void> => {
  await dbManager.write(async tx => {
    await tx
      .delete(chapterChatMessageSchema)
      .where(eq(chapterChatMessageSchema.chapterId, chapterId))
      .run();
  });
};

/**
 * Drops every chapter-scoped AI row for the given chapters. Used when chapters
 * or their novels are removed, and when chapters are re-created by a source
 * migration (chapter ids are not stable across either).
 */
export const deleteChapterAiData = async (
  chapterIds: number[],
): Promise<void> => {
  if (!chapterIds.length) {
    return;
  }

  await dbManager.write(async tx => {
    await tx
      .delete(chapterSummarySchema)
      .where(inArray(chapterSummarySchema.chapterId, chapterIds))
      .run();
    await tx
      .delete(chapterChatMessageSchema)
      .where(inArray(chapterChatMessageSchema.chapterId, chapterIds))
      .run();
  });
};

export const getChapterChatMessageCount = async (
  chapterId: number,
): Promise<number> => {
  const rows = await dbManager
    .select({ id: chapterChatMessageSchema.id })
    .from(chapterChatMessageSchema)
    .where(eq(chapterChatMessageSchema.chapterId, chapterId))
    .all();

  return rows.length;
};

export const getAllChapterSummaries = async (): Promise<
  ChapterSummaryRow[]
> => {
  return dbManager.select().from(chapterSummarySchema).all();
};

export const getAllChapterChatMessages = async (): Promise<
  ChapterChatMessageRow[]
> => {
  return dbManager
    .select()
    .from(chapterChatMessageSchema)
    .orderBy(asc(chapterChatMessageSchema.id))
    .all();
};

const BULK_INSERT_BATCH_SIZE = 200;

export const importChapterSummaries = async (
  summaries: ChapterSummaryInsert[],
): Promise<void> => {
  if (!summaries.length) {
    return;
  }

  await dbManager.write(async tx => {
    for (const summary of summaries) {
      const { id: _id, ...values } = summary;
      await tx
        .insert(chapterSummarySchema)
        .values(values)
        .onConflictDoUpdate({
          target: chapterSummarySchema.chapterId,
          set: {
            summary: values.summary,
            provider: values.provider ?? null,
            model: values.model ?? null,
            updatedAt: values.updatedAt ?? null,
          },
        })
        .run();
    }
  });
};

export const importChapterChatMessages = async (
  messages: ChapterChatMessageInsert[],
): Promise<void> => {
  if (!messages.length) {
    return;
  }

  await dbManager.write(async tx => {
    for (
      let index = 0;
      index < messages.length;
      index += BULK_INSERT_BATCH_SIZE
    ) {
      await tx
        .insert(chapterChatMessageSchema)
        .values(
          messages
            .slice(index, index + BULK_INSERT_BATCH_SIZE)
            .map(({ id: _id, ...values }) => values),
        )
        .run();
    }
  });
};

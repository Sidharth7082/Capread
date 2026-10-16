import { eq } from 'drizzle-orm';
import { dbManager } from '@database/db';
import {
  novelRecapSchema,
  type NovelRecapInsert,
  type NovelRecapRow,
} from '@database/schema';

export const getNovelRecap = async (
  novelId: number,
): Promise<NovelRecapRow | undefined> => {
  return dbManager
    .select()
    .from(novelRecapSchema)
    .where(eq(novelRecapSchema.novelId, novelId))
    .get();
};

export const upsertNovelRecap = async (
  recap: NovelRecapInsert,
): Promise<void> => {
  await dbManager.write(async tx => {
    await tx
      .insert(novelRecapSchema)
      .values(recap)
      .onConflictDoUpdate({
        target: novelRecapSchema.novelId,
        set: {
          summary: recap.summary,
          upToChapterId: recap.upToChapterId ?? null,
          chaptersCovered: recap.chaptersCovered ?? 0,
          provider: recap.provider ?? null,
          model: recap.model ?? null,
          updatedAt: recap.updatedAt ?? null,
        },
      })
      .run();
  });
};

export const deleteNovelRecap = async (novelId: number): Promise<void> => {
  await dbManager.write(async tx => {
    await tx
      .delete(novelRecapSchema)
      .where(eq(novelRecapSchema.novelId, novelId))
      .run();
  });
};

export const getAllNovelRecaps = async (): Promise<NovelRecapRow[]> => {
  return dbManager.select().from(novelRecapSchema).all();
};

export const importNovelRecaps = async (
  recaps: NovelRecapInsert[],
): Promise<void> => {
  if (!recaps.length) {
    return;
  }

  await dbManager.write(async tx => {
    for (const recap of recaps) {
      const { id: _id, ...values } = recap;
      await tx
        .insert(novelRecapSchema)
        .values(values)
        .onConflictDoUpdate({
          target: novelRecapSchema.novelId,
          set: {
            summary: values.summary,
            upToChapterId: values.upToChapterId ?? null,
            chaptersCovered: values.chaptersCovered ?? 0,
            provider: values.provider ?? null,
            model: values.model ?? null,
            updatedAt: values.updatedAt ?? null,
          },
        })
        .run();
    }
  });
};

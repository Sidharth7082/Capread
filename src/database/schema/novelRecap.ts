import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const novelRecap = sqliteTable(
  'NovelRecap',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    novelId: integer('novelId').notNull(),
    summary: text('summary').notNull(),
    upToChapterId: integer('upToChapterId'),
    chaptersCovered: integer('chaptersCovered').default(0).notNull(),
    provider: text('provider'),
    model: text('model'),
    updatedAt: text('updatedAt'),
  },
  table => [uniqueIndex('novel_recap_novel_unique').on(table.novelId)],
);

export type NovelRecapRow = typeof novelRecap.$inferSelect;
export type NovelRecapInsert = typeof novelRecap.$inferInsert;

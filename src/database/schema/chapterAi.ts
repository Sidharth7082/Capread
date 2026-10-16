import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const chapterSummary = sqliteTable(
  'ChapterSummary',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    chapterId: integer('chapterId').notNull(),
    summary: text('summary').notNull(),
    provider: text('provider'),
    model: text('model'),
    updatedAt: text('updatedAt'),
  },
  table => [uniqueIndex('chapter_summary_chapter_unique').on(table.chapterId)],
);

export const chapterChatMessage = sqliteTable(
  'ChapterChatMessage',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    chapterId: integer('chapterId').notNull(),
    role: text('role').notNull(),
    content: text('content').notNull(),
    createdAt: text('createdAt'),
  },
  table => [index('chapter_chat_message_chapter_idx').on(table.chapterId)],
);

export type ChapterSummaryRow = typeof chapterSummary.$inferSelect;
export type ChapterSummaryInsert = typeof chapterSummary.$inferInsert;
export type ChapterChatMessageRow = typeof chapterChatMessage.$inferSelect;
export type ChapterChatMessageInsert = typeof chapterChatMessage.$inferInsert;

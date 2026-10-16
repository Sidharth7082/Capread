import { category } from './category';
import { novel } from './novel';
import { chapter } from './chapter';
import { chapterChatMessage, chapterSummary } from './chapterAi';
import { novelCategory } from './novelCategory';
import { novelRecap } from './novelRecap';
import { repository } from './repository';

export {
  category as categorySchema,
  type CategoryRow,
  type CategoryInsert,
} from './category';
export { novel as novelSchema, type NovelRow, type NovelInsert } from './novel';
export {
  chapter as chapterSchema,
  type ChapterRow,
  type ChapterInsert,
} from './chapter';
export {
  novelCategory as novelCategorySchema,
  type NovelCategoryRow,
  type NovelCategoryInsert,
} from './novelCategory';
export {
  novelRecap as novelRecapSchema,
  type NovelRecapRow,
  type NovelRecapInsert,
} from './novelRecap';
export {
  chapterChatMessage as chapterChatMessageSchema,
  chapterSummary as chapterSummarySchema,
  type ChapterChatMessageInsert,
  type ChapterChatMessageRow,
  type ChapterSummaryInsert,
  type ChapterSummaryRow,
} from './chapterAi';
export {
  repository as repositorySchema,
  type RepositoryRow,
  type RepositoryInsert,
} from './repository';

/**
 * Unified schema object containing all database tables
 * Use this with Drizzle ORM for type-safe database operations
 */
export const schema = {
  category,
  novel,
  chapter,
  chapterChatMessage,
  chapterSummary,
  novelCategory,
  novelRecap,
  repository,
} as const;

export type Schema = typeof schema;

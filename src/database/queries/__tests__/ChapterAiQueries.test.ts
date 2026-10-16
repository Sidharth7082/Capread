/**
 * Tests for ChapterAiQueries
 *
 * These tests use a real in-memory database to verify actual data returned by queries.
 */

import './mockDb';
import { setupTestDatabase, getTestDb, teardownTestDatabase } from './setup';
import { clearAllTables, insertTestChapter, insertTestNovel } from './testData';

import {
  appendChapterChatMessage,
  clearChapterChatMessages,
  deleteChapterAiData,
  getAllChapterChatMessages,
  getAllChapterSummaries,
  getChapterChatMessageCount,
  getChapterChatMessages,
  getChapterSummary,
  importChapterChatMessages,
  importChapterSummaries,
  upsertChapterSummary,
} from '../ChapterAiQueries';

const countRows = (table: string): number => {
  const { sqlite } = getTestDb();
  const rows = sqlite.executeSync(`SELECT COUNT(*) AS count FROM ${table}`)
    .rows as { count: number }[];
  return rows[0].count;
};

describe('ChapterAiQueries', () => {
  beforeEach(() => {
    const testDb = setupTestDatabase();
    clearAllTables(testDb);
  });

  afterAll(() => {
    teardownTestDatabase();
  });

  it('should return undefined when the chapter has no summary', async () => {
    const testDb = getTestDb();
    const novelId = await insertTestNovel(testDb, { inLibrary: true });
    const chapterId = await insertTestChapter(testDb, novelId);

    expect(await getChapterSummary(chapterId)).toBeUndefined();
  });

  it('should keep a single summary per chapter when upserting', async () => {
    const testDb = getTestDb();
    const novelId = await insertTestNovel(testDb, { inLibrary: true });
    const chapterId = await insertTestChapter(testDb, novelId);

    await upsertChapterSummary({
      chapterId,
      summary: 'Hero arrives in the capital.',
      provider: 'https://api.example.com/v1',
      model: 'test-model',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    await upsertChapterSummary({
      chapterId,
      summary: 'Hero leaves the capital.',
      provider: 'https://api.example.com/v1',
      model: 'other-model',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });

    const row = await getChapterSummary(chapterId);
    expect(row).toMatchObject({
      chapterId,
      summary: 'Hero leaves the capital.',
      model: 'other-model',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
    expect(countRows('ChapterSummary')).toBe(1);
  });

  it('should append chat messages and read them back in order', async () => {
    const testDb = getTestDb();
    const novelId = await insertTestNovel(testDb, { inLibrary: true });
    const chapterId = await insertTestChapter(testDb, novelId);

    await appendChapterChatMessage({
      chapterId,
      role: 'user',
      content: 'who is the masked man?',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    await appendChapterChatMessage({
      chapterId,
      role: 'assistant',
      content: 'The chapter does not name him.',
      createdAt: '2026-01-01T00:00:01.000Z',
    });

    const messages = await getChapterChatMessages(chapterId);
    expect(messages.map(message => message.role)).toEqual([
      'user',
      'assistant',
    ]);
    expect(messages[0].content).toBe('who is the masked man?');
    expect(await getChapterChatMessageCount(chapterId)).toBe(2);
  });

  it('should clear chat messages for one chapter only', async () => {
    const testDb = getTestDb();
    const novelId = await insertTestNovel(testDb, { inLibrary: true });
    const firstChapterId = await insertTestChapter(testDb, novelId);
    const secondChapterId = await insertTestChapter(testDb, novelId);

    for (const chapterId of [firstChapterId, secondChapterId]) {
      await appendChapterChatMessage({
        chapterId,
        role: 'user',
        content: 'hello',
      });
    }

    await clearChapterChatMessages(firstChapterId);

    expect(await getChapterChatMessages(firstChapterId)).toHaveLength(0);
    expect(await getChapterChatMessages(secondChapterId)).toHaveLength(1);
  });

  it('should delete summaries and messages for the given chapters', async () => {
    const testDb = getTestDb();
    const novelId = await insertTestNovel(testDb, { inLibrary: true });
    const removedChapterId = await insertTestChapter(testDb, novelId);
    const keptChapterId = await insertTestChapter(testDb, novelId);

    for (const chapterId of [removedChapterId, keptChapterId]) {
      await upsertChapterSummary({ chapterId, summary: 'summary' });
      await appendChapterChatMessage({
        chapterId,
        role: 'user',
        content: 'question',
      });
    }

    await deleteChapterAiData([removedChapterId]);

    expect(await getChapterSummary(removedChapterId)).toBeUndefined();
    expect(await getChapterChatMessages(removedChapterId)).toHaveLength(0);
    expect(await getChapterSummary(keptChapterId)).toBeDefined();
    expect(await getChapterChatMessages(keptChapterId)).toHaveLength(1);
    expect(countRows('ChapterSummary')).toBe(1);
    expect(countRows('ChapterChatMessage')).toBe(1);
  });

  it('should ignore an empty chapter list', async () => {
    const testDb = getTestDb();
    const novelId = await insertTestNovel(testDb, { inLibrary: true });
    const chapterId = await insertTestChapter(testDb, novelId);

    await upsertChapterSummary({ chapterId, summary: 'summary' });
    await deleteChapterAiData([]);

    expect(await getChapterSummary(chapterId)).toBeDefined();
  });

  it('should export and re-import AI rows', async () => {
    const testDb = getTestDb();
    const novelId = await insertTestNovel(testDb, { inLibrary: true });
    const chapterId = await insertTestChapter(testDb, novelId);
    const restoredChapterId = await insertTestChapter(testDb, novelId);

    await upsertChapterSummary({ chapterId, summary: 'original summary' });
    await appendChapterChatMessage({
      chapterId,
      role: 'user',
      content: 'original question',
    });

    const summaries = await getAllChapterSummaries();
    const messages = await getAllChapterChatMessages();
    expect(summaries).toHaveLength(1);
    expect(messages).toHaveLength(1);

    await importChapterSummaries(
      summaries.map(row => ({
        chapterId: restoredChapterId,
        summary: row.summary,
      })),
    );
    await importChapterChatMessages(
      messages.map(row => ({
        chapterId: restoredChapterId,
        role: row.role,
        content: row.content,
        createdAt: row.createdAt,
      })),
    );

    const restoredSummary = await getChapterSummary(restoredChapterId);
    expect(restoredSummary?.summary).toBe('original summary');
    const restoredMessages = await getChapterChatMessages(restoredChapterId);
    expect(restoredMessages.map(message => message.content)).toEqual([
      'original question',
    ]);

    await importChapterSummaries([]);
    await importChapterChatMessages([]);
    expect(countRows('ChapterSummary')).toBe(2);
  });
});

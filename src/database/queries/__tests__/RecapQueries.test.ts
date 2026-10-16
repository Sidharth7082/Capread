/**
 * Tests for RecapQueries
 *
 * These tests use a real in-memory database to verify actual data returned by queries.
 */

import './mockDb';
import { setupTestDatabase, getTestDb, teardownTestDatabase } from './setup';
import { insertTestNovel, clearAllTables } from './testData';

import {
  deleteNovelRecap,
  getNovelRecap,
  upsertNovelRecap,
} from '../RecapQueries';

describe('RecapQueries', () => {
  beforeEach(() => {
    const testDb = setupTestDatabase();
    clearAllTables(testDb);
  });

  afterAll(() => {
    teardownTestDatabase();
  });

  it('should return undefined when the novel has no recap', async () => {
    const testDb = getTestDb();
    const novelId = await insertTestNovel(testDb, { inLibrary: true });

    expect(await getNovelRecap(novelId)).toBeUndefined();
  });

  it('should insert and read back a recap', async () => {
    const testDb = getTestDb();
    const novelId = await insertTestNovel(testDb, { inLibrary: true });

    await upsertNovelRecap({
      novelId,
      summary: 'Previously, the hero left home.',
      upToChapterId: 7,
      chaptersCovered: 5,
      provider: 'https://api.example.com/v1',
      model: 'test-model',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    const row = await getNovelRecap(novelId);
    expect(row).toMatchObject({
      novelId,
      summary: 'Previously, the hero left home.',
      upToChapterId: 7,
      chaptersCovered: 5,
      provider: 'https://api.example.com/v1',
      model: 'test-model',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('should keep a single recap per novel when upserting', async () => {
    const testDb = getTestDb();
    const novelId = await insertTestNovel(testDb, { inLibrary: true });

    await upsertNovelRecap({
      novelId,
      summary: 'first',
      upToChapterId: 1,
      chaptersCovered: 1,
    });
    await upsertNovelRecap({
      novelId,
      summary: 'second',
      upToChapterId: 2,
      chaptersCovered: 2,
    });

    const row = await getNovelRecap(novelId);
    expect(row?.summary).toBe('second');
    expect(row?.upToChapterId).toBe(2);
    expect(row?.chaptersCovered).toBe(2);

    const count = testDb.sqlite.executeSync(
      'SELECT COUNT(*) AS count FROM NovelRecap',
    ).rows as { count: number }[];
    expect(count[0].count).toBe(1);
  });

  it('should delete a recap', async () => {
    const testDb = getTestDb();
    const novelId = await insertTestNovel(testDb, { inLibrary: true });

    await upsertNovelRecap({
      novelId,
      summary: 'to be deleted',
      upToChapterId: 3,
      chaptersCovered: 3,
    });

    await deleteNovelRecap(novelId);

    expect(await getNovelRecap(novelId)).toBeUndefined();
  });
});

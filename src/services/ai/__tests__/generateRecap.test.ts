import { generateNovelRecap } from '../recap';
import { fetchTimeout } from '@utils/fetch/fetch';
import { getNovelById } from '@database/queries/NovelQueries';
import { getNovelChapters } from '@database/queries/ChapterQueries';
import { upsertNovelRecap } from '@database/queries/RecapQueries';
import NativeFile from '@modules/native-file';

jest.mock('@utils/fetch/fetch', () => ({
  fetchTimeout: jest.fn(),
}));

const mockedFetchTimeout = fetchTimeout as jest.MockedFunction<
  typeof fetchTimeout
>;
const mockedGetNovelById = getNovelById as jest.MockedFunction<
  typeof getNovelById
>;
const mockedGetNovelChapters = getNovelChapters as jest.MockedFunction<
  typeof getNovelChapters
>;
const mockedUpsertNovelRecap = upsertNovelRecap as jest.MockedFunction<
  typeof upsertNovelRecap
>;
const mockedReadFile = NativeFile.readFile as jest.MockedFunction<
  typeof NativeFile.readFile
>;

const config = {
  baseUrl: 'http://10.0.2.2:8765/v1',
  apiKey: '',
  model: 'mock-model',
};

const completion = (content: string) =>
  ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ choices: [{ message: { content } }] }),
  } as unknown as Response);

const readChapter = (id: number, name: string, read: boolean) => ({
  id,
  novelId: 1,
  path: `chapter-${id}`,
  name,
  readTime: read ? '2026-01-01 00:00:00' : null,
});

describe('generateNovelRecap', () => {
  beforeEach(() => {
    mockedFetchTimeout.mockClear();
    mockedUpsertNovelRecap.mockClear();
    mockedGetNovelById.mockReturnValue({
      id: 1,
      name: 'Test Novel',
      pluginId: 'allnovel',
    } as never);
    mockedReadFile.mockResolvedValue(
      '<html><body><p>Chapter body text.</p></body></html>',
    );
  });

  it('summarizes read chapters before the target and caches the recap', async () => {
    mockedGetNovelChapters.mockResolvedValue([
      readChapter(1, 'Chapter 1', true),
      readChapter(2, 'Chapter 2', true),
      readChapter(3, 'Chapter 3', false),
    ] as never);
    mockedFetchTimeout.mockResolvedValue(
      completion('Previously, the hero trained.'),
    );

    const progress: { completedSteps: number; totalSteps: number }[] = [];
    const result = await generateNovelRecap({
      novelId: 1,
      upToChapterId: 3,
      config,
      onProgress: value => progress.push(value),
    });

    expect(result).toEqual({
      summary: 'Previously, the hero trained.',
      upToChapterId: 2,
      chaptersCovered: 2,
    });

    expect(mockedFetchTimeout).toHaveBeenCalledTimes(1);
    expect(mockedUpsertNovelRecap).toHaveBeenCalledWith(
      expect.objectContaining({
        novelId: 1,
        summary: 'Previously, the hero trained.',
        upToChapterId: 2,
        chaptersCovered: 2,
        model: 'mock-model',
      }),
    );

    expect(progress[0]).toEqual({ completedSteps: 0, totalSteps: 1 });
    expect(progress[progress.length - 1]).toEqual({
      completedSteps: 1,
      totalSteps: 1,
    });
  });

  it('map-reduces large chapter sets into a single recap', async () => {
    const longText = 'x'.repeat(8000);
    mockedGetNovelChapters.mockResolvedValue(
      Array.from({ length: 6 }, (_, index) =>
        readChapter(index + 1, `Chapter ${index + 1}`, true),
      ) as never,
    );
    mockedReadFile.mockResolvedValue(
      `<html><body><p>${longText}</p></body></html>`,
    );

    mockedFetchTimeout.mockImplementation(async (_url, init) => {
      const body = JSON.parse((init as { body: string }).body);
      const userContent = body.messages[1].content as string;
      return completion(
        userContent.startsWith('Notes ')
          ? 'Combined recap of everything.'
          : 'Partial notes.',
      );
    });

    const result = await generateNovelRecap({ novelId: 1, config });

    expect(result.summary).toBe('Combined recap of everything.');
    // Per-chapter cap (4000) x 6 chapters over the 20000 batch budget => 2
    // map calls plus one reduce call.
    expect(mockedFetchTimeout).toHaveBeenCalledTimes(3);
    expect(mockedUpsertNovelRecap).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: 'Combined recap of everything.',
        upToChapterId: 6,
        chaptersCovered: 6,
      }),
    );
  });

  it('rejects when there are no read chapters to recap', async () => {
    mockedGetNovelChapters.mockResolvedValue([
      readChapter(1, 'Chapter 1', false),
    ] as never);

    await expect(generateNovelRecap({ novelId: 1, config })).rejects.toThrow(
      'No read chapters',
    );
  });
});

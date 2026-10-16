import { askAboutChapter, summarizeChapter } from '../chapter';
import { fetchTimeout } from '@utils/fetch/fetch';
import { getNovelById } from '@database/queries/NovelQueries';
import { getNovelChapters } from '@database/queries/ChapterQueries';
import {
  appendChapterChatMessage,
  upsertChapterSummary,
} from '@database/queries/ChapterAiQueries';
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
const mockedUpsertChapterSummary = upsertChapterSummary as jest.MockedFunction<
  typeof upsertChapterSummary
>;
const mockedAppendChapterChatMessage =
  appendChapterChatMessage as jest.MockedFunction<
    typeof appendChapterChatMessage
  >;
const mockedReadFile = NativeFile.readFile as jest.MockedFunction<
  typeof NativeFile.readFile
>;

const config = {
  baseUrl: 'http://10.0.2.2:8765/v1',
  apiKey: 'user-key',
  model: 'mock-model',
};

const target = { novelId: 1, chapterId: 7 };

const completion = (content: string) =>
  ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ choices: [{ message: { content } }] }),
  } as unknown as Response);

const sentMessages = () => {
  const body = mockedFetchTimeout.mock.calls[0][1]?.body as string;
  return JSON.parse(body).messages as { role: string; content: string }[];
};

describe('chapter AI service', () => {
  beforeEach(() => {
    mockedFetchTimeout.mockClear();
    mockedUpsertChapterSummary.mockClear();
    mockedAppendChapterChatMessage.mockClear();
    mockedGetNovelById.mockReturnValue({
      id: 1,
      name: 'Test Novel',
      pluginId: 'allnovel',
    } as never);
    mockedGetNovelChapters.mockResolvedValue([
      { id: 7, novelId: 1, path: 'chapter-7', name: 'Chapter 7' },
    ] as never);
    mockedReadFile.mockResolvedValue(
      '<html><body><p>The masked man watched from the roof.</p></body></html>',
    );
  });

  it('summarizes a chapter and caches the result', async () => {
    mockedFetchTimeout.mockResolvedValue(completion('A short summary.'));

    const summary = await summarizeChapter(target, config);

    expect(summary).toBe('A short summary.');
    expect(mockedUpsertChapterSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        chapterId: 7,
        summary: 'A short summary.',
        provider: config.baseUrl,
        model: config.model,
      }),
    );

    const messages = sentMessages();
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toContain('Chapter 7');
    expect(messages[1].content).toContain('The masked man watched');
  });

  it('sends the chapter text with the question and stores both turns', async () => {
    mockedFetchTimeout.mockResolvedValue(
      completion('The chapter does not name him.'),
    );

    const answer = await askAboutChapter(
      target,
      'who is the masked man?',
      [],
      config,
    );

    expect(answer).toBe('The chapter does not name him.');

    const messages = sentMessages();
    expect(messages[0].content).toContain('The masked man watched');
    expect(messages[messages.length - 1]).toEqual({
      role: 'user',
      content: 'who is the masked man?',
    });

    expect(mockedAppendChapterChatMessage).toHaveBeenCalledTimes(2);
    expect(mockedAppendChapterChatMessage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ chapterId: 7, role: 'user' }),
    );
    expect(mockedAppendChapterChatMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        chapterId: 7,
        role: 'assistant',
        content: 'The chapter does not name him.',
      }),
    );
  });

  it('replays previous turns after the chapter context', async () => {
    mockedFetchTimeout.mockResolvedValue(completion('He is the butler.'));

    await askAboutChapter(
      target,
      'and who is he?',
      [
        { role: 'user', content: 'who is the masked man?' },
        { role: 'assistant', content: 'The chapter does not name him.' },
      ],
      config,
    );

    const messages = sentMessages();
    expect(messages[1]).toEqual({
      role: 'user',
      content: 'who is the masked man?',
    });
    expect(messages[2]).toEqual({
      role: 'assistant',
      content: 'The chapter does not name him.',
    });
    expect(messages[3].content).toBe('and who is he?');
  });

  it('drops history when memory is set to zero turns', async () => {
    mockedFetchTimeout.mockResolvedValue(completion('answer'));

    await askAboutChapter(
      target,
      'new question',
      [{ role: 'user', content: 'old question' }],
      config,
      { historyTurns: 0 },
    );

    const messages = sentMessages();
    expect(messages).toHaveLength(2);
    expect(messages[1].content).toBe('new question');
  });

  it('truncates the chapter context and marks it in the prompt', async () => {
    mockedReadFile.mockResolvedValue(
      `<html><body><p>${'long text '.repeat(50)}</p></body></html>`,
    );
    mockedFetchTimeout.mockResolvedValue(completion('answer'));

    await askAboutChapter(target, 'anything?', [], config, {
      contextChars: 60,
    });

    const messages = sentMessages();
    expect(messages[0].content).toContain('truncated');
    const sentChapterText = messages[0].content
      .split('CHAPTER TEXT:')[1]
      .trim();
    expect(sentChapterText.endsWith('…')).toBe(true);
    expect(sentChapterText.length).toBeLessThanOrEqual(61);
  });

  it('fails when the chapter has no readable text', async () => {
    mockedReadFile.mockResolvedValue('<html><body></body></html>');

    await expect(summarizeChapter(target, config)).rejects.toThrow(
      'This chapter has no readable text',
    );
    expect(mockedFetchTimeout).not.toHaveBeenCalled();
  });

  it('fails on an empty question without calling the endpoint', async () => {
    await expect(askAboutChapter(target, '   ', [], config)).rejects.toThrow(
      'Question is empty',
    );
    expect(mockedFetchTimeout).not.toHaveBeenCalled();
  });
});

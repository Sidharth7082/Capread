import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import AiChapterAssistant from '../AiChapterAssistant';
import { askAboutChapter, summarizeChapter } from '@services/ai/chapter';
import {
  clearChapterChatMessages,
  getChapterChatMessages,
  getChapterSummary,
} from '@database/queries/ChapterAiQueries';
import { showToast } from '@utils/showToast';
import { setStringAsync } from 'expo-clipboard';

const mockShowToast = showToast as jest.MockedFunction<typeof showToast>;
const mockSetStringAsync = setStringAsync as jest.MockedFunction<
  typeof setStringAsync
>;

jest.mock('@utils/showToast', () => ({
  showToast: jest.fn(),
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock('@services/ai/chapter', () => ({
  summarizeChapter: jest.fn(),
  askAboutChapter: jest.fn(),
}));

const mockSummarizeChapter = summarizeChapter as jest.MockedFunction<
  typeof summarizeChapter
>;
const mockAskAboutChapter = askAboutChapter as jest.MockedFunction<
  typeof askAboutChapter
>;
const mockGetChapterSummary = getChapterSummary as jest.MockedFunction<
  typeof getChapterSummary
>;
const mockGetChapterChatMessages =
  getChapterChatMessages as jest.MockedFunction<typeof getChapterChatMessages>;
const mockClearChapterChatMessages =
  clearChapterChatMessages as jest.MockedFunction<
    typeof clearChapterChatMessages
  >;

const mockAiSettings = {
  enabled: true,
  baseUrl: 'http://10.0.2.2:8765/v1',
  apiKey: 'key',
  model: 'mock-model',
  contextChars: 16000,
  historyTurns: 10,
  setAiSettings: jest.fn(),
};

jest.mock('@hooks/persisted', () => ({
  useAiSettings: () => mockAiSettings,
  useTheme: () => ({
    primary: '#111',
    onPrimary: '#fff',
    onSurface: '#222',
    onSurfaceVariant: '#333',
    background: '#fff',
    surfaceVariant: '#eee',
    outline: '#999',
    scrim: '#000',
  }),
}));

const renderAssistant = (onDismiss = jest.fn()) =>
  render(
    <AiChapterAssistant
      chapter={{ id: 7, name: 'Chapter 7' }}
      novelId={1}
      visible
      onDismiss={onDismiss}
    />,
  );

describe('AiChapterAssistant', () => {
  beforeEach(() => {
    mockShowToast.mockClear();
    mockSetStringAsync.mockClear();
    mockSummarizeChapter.mockReset();
    mockAskAboutChapter.mockReset();
    mockGetChapterSummary.mockReset();
    mockGetChapterChatMessages.mockReset();
    mockClearChapterChatMessages.mockReset();
    mockGetChapterSummary.mockResolvedValue(undefined);
    mockGetChapterChatMessages.mockResolvedValue([]);
  });

  it('shows the empty hint when nothing is stored yet', async () => {
    renderAssistant();

    expect(
      await screen.findByText(/Ask anything about this chapter/),
    ).toBeTruthy();
  });

  it('renders the stored summary and chat history', async () => {
    mockGetChapterSummary.mockResolvedValue({
      id: 1,
      chapterId: 7,
      summary: 'The hero reaches the capital.',
      provider: 'http://10.0.2.2:8765/v1',
      model: 'mock-model',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    mockGetChapterChatMessages.mockResolvedValue([
      {
        id: 1,
        chapterId: 7,
        role: 'user',
        content: 'who is the masked man?',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 2,
        chapterId: 7,
        role: 'assistant',
        content: 'This chapter does not name him.',
        createdAt: '2026-01-01T00:00:01.000Z',
      },
    ]);

    renderAssistant();

    expect(
      await screen.findByText('The hero reaches the capital.'),
    ).toBeTruthy();
    expect(screen.getByText('who is the masked man?')).toBeTruthy();
    expect(screen.getByText('This chapter does not name him.')).toBeTruthy();
  });

  it('copies the stored summary to the clipboard', async () => {
    mockGetChapterSummary.mockResolvedValue({
      id: 1,
      chapterId: 7,
      summary: 'The hero reaches the capital.',
      provider: 'http://10.0.2.2:8765/v1',
      model: 'mock-model',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    renderAssistant();

    fireEvent.press(await screen.findByLabelText('Copy summary'));

    await waitFor(() =>
      expect(mockSetStringAsync).toHaveBeenCalledWith(
        'The hero reaches the capital.',
      ),
    );
    expect(mockShowToast).toHaveBeenCalledWith('Summary copied');
  });

  it('summarizes the chapter through the service', async () => {
    mockSummarizeChapter.mockResolvedValue('A fresh summary.');

    renderAssistant();
    fireEvent.press(await screen.findByText('Summarize this chapter'));

    await waitFor(() =>
      expect(mockSummarizeChapter).toHaveBeenCalledWith(
        { novelId: 1, chapterId: 7 },
        expect.objectContaining({ model: 'mock-model' }),
        { contextChars: 16000 },
      ),
    );
    expect(await screen.findByText('A fresh summary.')).toBeTruthy();
  });

  it('sends a question and renders the answer', async () => {
    mockAskAboutChapter.mockResolvedValue('He is the butler.');
    mockGetChapterChatMessages.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: 1,
        chapterId: 7,
        role: 'user',
        content: 'who is he?',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 2,
        chapterId: 7,
        role: 'assistant',
        content: 'He is the butler.',
        createdAt: '2026-01-01T00:00:01.000Z',
      },
    ]);

    renderAssistant();
    fireEvent.changeText(
      await screen.findByPlaceholderText('Ask about this chapter…'),
      'who is he?',
    );
    fireEvent.press(screen.getByText('Send'));

    await waitFor(() =>
      expect(mockAskAboutChapter).toHaveBeenCalledWith(
        { novelId: 1, chapterId: 7 },
        'who is he?',
        [],
        expect.objectContaining({ model: 'mock-model' }),
        { contextChars: 16000, historyTurns: 10 },
      ),
    );

    expect(await screen.findByText('He is the butler.')).toBeTruthy();
  });

  it('clears the stored chat', async () => {
    mockGetChapterChatMessages.mockResolvedValue([
      {
        id: 1,
        chapterId: 7,
        role: 'user',
        content: 'old question',
        createdAt: null,
      },
    ]);
    mockClearChapterChatMessages.mockResolvedValue(undefined);

    renderAssistant();
    fireEvent.press(await screen.findByText('Clear chat'));

    await waitFor(() =>
      expect(mockClearChapterChatMessages).toHaveBeenCalledWith(7),
    );
    expect(screen.queryByText('old question')).toBeNull();
    expect(mockShowToast).toHaveBeenCalled();
  });

  it('warns instead of calling the endpoint when AI is not configured', async () => {
    mockAiSettings.model = '';

    renderAssistant();
    fireEvent.press(await screen.findByText('Summarize this chapter'));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalled());
    expect(mockSummarizeChapter).not.toHaveBeenCalled();

    mockAiSettings.model = 'mock-model';
  });
});

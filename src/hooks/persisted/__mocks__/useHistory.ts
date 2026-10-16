const mockUseHistory = jest.fn(() => ({
  isLoading: false,
  history: [],
  error: undefined,
  removeChapterFromHistory: jest.fn(),
  removeNovelFromHistory: jest.fn(),
  clearAllHistory: jest.fn(),
}));

export default mockUseHistory;

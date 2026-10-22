import { fireEvent, render, screen } from '@testing-library/react-native';

import ReaderAppbar from '../ReaderAppbar';

const mockChapter = {
  id: 1,
  name: 'Chapter 1',
  path: '/chapter-1',
  novelId: 1,
  bookmark: false,
};

const mockNovel = {
  id: 1,
  name: 'Novel',
  pluginId: 'plugin',
  isLocal: false,
};

jest.mock('../../ChapterContext', () => ({
  useChapterContext: () => ({
    chapter: mockChapter,
    novel: mockNovel,
    refetch: jest.fn(),
  }),
}));

jest.mock('../ReaderSearchbar', () => () => null);

jest.mock('@screens/novel/NovelContext', () => ({
  useNovelLayout: () => ({ statusBarHeight: 0 }),
}));

jest.mock('@hooks/persisted', () => ({
  useTheme: () => ({ surface: '#111' }),
}));

jest.mock('@database/queries/ChapterQueries', () => ({
  bookmarkChapter: jest.fn(),
}));

jest.mock('@i18n/translations', () => ({
  getString: (key: string) => key,
}));

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    __esModule: true,
    default: {
      View: ({ children, ...props }: any) =>
        React.createElement(View, props, children),
    },
    Easing: { bezier: () => 'bezier' },
    ReduceMotion: { System: 0 },
    withTiming: (value: number) => value,
  };
});

jest.mock('@components', () => {
  const React = require('react');
  const { Pressable, Text, View } = require('react-native');

  const Menu: any = ({ anchor, children, visible }: any) =>
    React.createElement(View, null, anchor, visible ? children : null);
  Menu.Item = ({ title, onPress }: any) =>
    React.createElement(
      Pressable,
      { testID: `menu-${title}`, onPress },
      React.createElement(Text, null, title),
    );

  return {
    IconButtonV2: ({ name, onPress, accessibilityLabel }: any) =>
      React.createElement(
        Pressable,
        { testID: `icon-${name}`, onPress },
        React.createElement(Text, null, accessibilityLabel || ''),
      ),
    Menu,
  };
});

const mockTheme = {
  surface: '#111',
  onSurface: '#222',
  onSurfaceVariant: '#333',
  primary: '#444',
};

const mockCopyChapterText = jest.fn();
const mockCopyChapterLink = jest.fn();
const mockShareChapter = jest.fn();

const renderAppbar = () =>
  render(
    <ReaderAppbar
      theme={mockTheme as any}
      goBack={jest.fn()}
      bookmarked={false}
      setBookmarked={jest.fn()}
      searchVisible={false}
      setSearchVisible={jest.fn()}
      searchText=""
      setSearchText={jest.fn()}
      searchResult={{} as any}
      resetSearchResult={jest.fn()}
      resetSearch={jest.fn()}
      openInWebView={jest.fn()}
      openInBrowser={jest.fn()}
      shareChapter={mockShareChapter}
      copyChapterText={mockCopyChapterText}
      copyChapterLink={mockCopyChapterLink}
      showRecap={jest.fn()}
      showAssistant={jest.fn()}
    />,
  );

describe('ReaderAppbar', () => {
  beforeEach(() => {
    mockCopyChapterText.mockClear();
    mockCopyChapterLink.mockClear();
    mockShareChapter.mockClear();
  });

  it('offers both copy actions in the menu and calls their handlers', () => {
    renderAppbar();

    fireEvent.press(screen.getByTestId('icon-dots-vertical'));
    expect(screen.getByTestId('menu-readerScreen.copyChapter')).toBeTruthy();
    expect(screen.getByTestId('menu-readerScreen.copyLink')).toBeTruthy();

    fireEvent.press(screen.getByTestId('menu-readerScreen.copyChapter'));
    expect(mockCopyChapterText).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId('icon-dots-vertical'));
    fireEvent.press(screen.getByTestId('menu-readerScreen.copyLink'));
    expect(mockCopyChapterLink).toHaveBeenCalledTimes(1);

    expect(mockShareChapter).not.toHaveBeenCalled();
  });
});

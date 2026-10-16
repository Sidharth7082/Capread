import {
  _restoreNovelAndChapters,
  getAllNovels,
} from '@database/queries/NovelQueries';
import { getAllNovelChaptersForBackup } from '@database/queries/ChapterQueries';
import {
  _restoreCategory,
  getAllNovelCategories,
  getCategoriesFromDb,
} from '@database/queries/CategoryQueries';
import NativeFile from '@modules/native-file';
import { MMKVStorage } from '@utils/mmkv/mmkv';
import { prepareBackupData, restoreData } from '../utils';
import type { BackupOptions } from '../options';
import {
  getAllNovelRecaps,
  importNovelRecaps,
} from '@database/queries/RecapQueries';
import {
  getAllChapterChatMessages,
  getAllChapterSummaries,
  importChapterChatMessages,
  importChapterSummaries,
} from '@database/queries/ChapterAiQueries';

jest.mock('@database/queries/NovelQueries', () => ({
  _restoreNovelAndChapters: jest.fn(),
  getAllNovels: jest.fn(),
}));

jest.mock('@database/queries/ChapterQueries', () => ({
  getAllNovelChaptersForBackup: jest.fn(),
}));

jest.mock('@database/queries/CategoryQueries', () => ({
  _restoreCategory: jest.fn(),
  getAllNovelCategories: jest.fn(),
  getCategoriesFromDb: jest.fn(),
}));

jest.mock('@database/queries/RecapQueries', () => ({
  getAllNovelRecaps: jest.fn(async () => []),
  importNovelRecaps: jest.fn(),
}));

jest.mock('@database/queries/ChapterAiQueries', () => ({
  getAllChapterSummaries: jest.fn(async () => []),
  getAllChapterChatMessages: jest.fn(async () => []),
  importChapterSummaries: jest.fn(),
  importChapterChatMessages: jest.fn(),
}));

jest.mock('@hooks/persisted/useSelfHost', () => ({
  SELF_HOST_BACKUP: 'SELF_HOST_BACKUP',
}));

jest.mock('@hooks/persisted/migrations/trackerMigration', () => ({
  OLD_TRACKED_NOVEL_PREFIX: 'OLD_TRACKED_NOVEL_PREFIX',
}));

jest.mock('@hooks/persisted/useUpdates', () => ({
  LAST_UPDATE_TIME: 'LAST_UPDATE_TIME',
}));

jest.mock('@utils/mmkv/mmkv', () => ({
  MMKVStorage: {
    getAllKeys: jest.fn(() => []),
    getBoolean: jest.fn(),
    getString: jest.fn(),
    set: jest.fn(),
  },
}));

jest.mock('@i18n/translations', () => ({
  getString: (key: string) => key,
}));

jest.mock('@plugins/pluginManager', () => ({
  INSTALLED_PLUGINS_KEY: 'INSTALL_PLUGINS',
}));

jest.mock('@utils/Storages', () => ({
  NOVEL_STORAGE: '/storage/Novels',
  ROOT_STORAGE: '/storage',
}));

const pluginOnlyOptions: BackupOptions = {
  library: false,
  settings: false,
  plugins: true,
  downloadedFiles: false,
  aiData: false,
};

describe('selective backup data', () => {
  beforeEach(() => {
    jest.mocked(NativeFile.exists).mockResolvedValue(false);
    jest.mocked(NativeFile.mkdir).mockResolvedValue(undefined);
    jest.mocked(NativeFile.writeFile).mockResolvedValue(undefined);
    jest.mocked(NativeFile.copyFile).mockResolvedValue(undefined);
    jest.mocked(getAllNovels).mockResolvedValue([]);
    jest.mocked(getAllNovelChaptersForBackup).mockResolvedValue([]);
    jest.mocked(getCategoriesFromDb).mockResolvedValue([]);
    jest.mocked(getAllNovelCategories).mockResolvedValue([]);
    jest.mocked(_restoreNovelAndChapters).mockImplementation(async novel => ({
      pluginId: novel.pluginId,
      backupNovelId: novel.id,
      restoredNovelId: novel.id,
      chapters: novel.chapters.map(chapter => ({
        backupChapterId: chapter.id,
        restoredChapterId: chapter.id,
      })),
    }));
  });

  it('writes the selected sections to the v2 manifest', async () => {
    await prepareBackupData('/cache', pluginOnlyOptions);

    expect(NativeFile.writeFile).toHaveBeenCalledTimes(2);
    expect(NativeFile.writeFile).toHaveBeenCalledWith(
      '/cache/Version.json',
      expect.stringContaining(
        '"sections":{"library":false,"settings":false,"plugins":true,"downloadedFiles":false,"aiData":false}',
      ),
    );
    expect(getAllNovels).not.toHaveBeenCalled();
    expect(getCategoriesFromDb).not.toHaveBeenCalled();
    expect(NativeFile.writeFile).toHaveBeenCalledWith(
      '/cache/Plugins.json',
      '[]',
    );
  });

  it('does not warn about sections intentionally omitted by the manifest', async () => {
    jest
      .mocked(NativeFile.readFile)
      .mockResolvedValueOnce(
        JSON.stringify({
          appVersion: '2.1.0',
          formatVersion: 2,
          sections: pluginOnlyOptions,
        }),
      )
      .mockResolvedValueOnce('[]');
    jest
      .mocked(NativeFile.exists)
      .mockImplementation(async path => path.endsWith('/Plugins.json'));

    const result = await restoreData('/cache');

    expect(result).toMatchObject({
      failedNovelCount: 0,
      failedCategoryCount: 0,
      failedSectionCount: 0,
      settingsRestored: true,
      manifest: {
        formatVersion: 2,
        sections: pluginOnlyOptions,
      },
    });
    expect(_restoreNovelAndChapters).not.toHaveBeenCalled();
    expect(_restoreCategory).not.toHaveBeenCalled();
    expect(MMKVStorage.set).toHaveBeenCalledWith('INSTALL_PLUGINS', '[]');
  });

  it('merges restored plugins with the existing registry', async () => {
    const options: BackupOptions = {
      library: false,
      settings: true,
      plugins: true,
      downloadedFiles: false,
      aiData: false,
    };
    jest
      .mocked(NativeFile.exists)
      .mockImplementation(
        async path =>
          path.endsWith('/Version.json') ||
          path.endsWith('/Setting.json') ||
          path.endsWith('/Plugins.json'),
      );
    jest.mocked(NativeFile.readFile).mockImplementation(async path => {
      if (path.endsWith('/Version.json')) {
        return JSON.stringify({
          appVersion: '2.1.0',
          formatVersion: 2,
          sections: options,
        });
      }
      if (path.endsWith('/Setting.json')) {
        return JSON.stringify({
          INSTALL_PLUGINS: JSON.stringify([
            { id: 'restored', name: 'Restored' },
          ]),
          THEME: 'dark',
        });
      }
      return JSON.stringify([{ id: 'restored', name: 'Restored' }]);
    });
    jest
      .mocked(MMKVStorage.getString)
      .mockReturnValueOnce(
        JSON.stringify([{ id: 'existing', name: 'Existing' }]),
      );

    await restoreData('/cache');

    expect(MMKVStorage.set).toHaveBeenCalledWith('THEME', 'dark');
    expect(MMKVStorage.set).toHaveBeenCalledWith(
      'INSTALL_PLUGINS',
      JSON.stringify([
        { id: 'existing', name: 'Existing' },
        { id: 'restored', name: 'Restored' },
      ]),
    );
  });

  it('merges the plugin registry from legacy settings', async () => {
    jest
      .mocked(NativeFile.exists)
      .mockImplementation(async path => path.endsWith('/Setting.json'));
    jest.mocked(NativeFile.readFile).mockImplementation(async path => {
      if (path.endsWith('/Version.json')) {
        return JSON.stringify({ version: '2.0.0' });
      }
      return JSON.stringify({
        INSTALL_PLUGINS: JSON.stringify([{ id: 'legacy', name: 'Legacy' }]),
      });
    });
    jest
      .mocked(MMKVStorage.getString)
      .mockReturnValueOnce(
        JSON.stringify([{ id: 'existing', name: 'Existing' }]),
      );

    await restoreData('/cache');

    expect(MMKVStorage.set).toHaveBeenCalledWith(
      'INSTALL_PLUGINS',
      JSON.stringify([
        { id: 'existing', name: 'Existing' },
        { id: 'legacy', name: 'Legacy' },
      ]),
    );
  });

  it('includes stored covers with library data when downloads are omitted', async () => {
    jest.mocked(getAllNovels).mockResolvedValueOnce([
      {
        id: 1,
        name: 'Example',
        path: '/example',
        pluginId: 'source',
        cover: 'file:///storage/Novels/source/1/cover.png?123',
      },
    ]);
    jest.mocked(getAllNovelChaptersForBackup).mockResolvedValueOnce([
      {
        id: 10,
        novelId: 1,
        path: '/chapter-1',
        name: 'Chapter 1',
        isDownloaded: true,
      },
    ] as Awaited<ReturnType<typeof getAllNovelChaptersForBackup>>);

    await prepareBackupData('/cache', {
      library: true,
      settings: false,
      plugins: false,
      downloadedFiles: false,
      aiData: false,
    });

    const novelWrite = jest
      .mocked(NativeFile.writeFile)
      .mock.calls.find(([path]) => path.endsWith('/1.json'));
    expect(JSON.parse(novelWrite?.[1] ?? '{}')).toMatchObject({
      cover: '/Novels/source/1/cover.png?123',
      chapters: [{ id: 10, isDownloaded: false }],
    });
    expect(NativeFile.copyFile).toHaveBeenCalledWith(
      'file:///storage/Novels/source/1/cover.png',
      '/cache/Covers/1',
    );
  });

  it('restores stored covers from library data and preserves missing covers', async () => {
    const options: BackupOptions = {
      library: true,
      settings: false,
      plugins: false,
      downloadedFiles: false,
      aiData: false,
    };
    jest.mocked(NativeFile.readFile).mockImplementation(async path => {
      if (path.endsWith('/Version.json')) {
        return JSON.stringify({
          appVersion: '2.1.2',
          formatVersion: 2,
          sections: options,
        });
      }
      if (path.endsWith('/1.json')) {
        return JSON.stringify({
          id: 1,
          name: 'Stored cover',
          path: '/stored-cover',
          pluginId: 'source',
          cover: '/Novels/source/1/cover.png?123',
          chapters: [],
        });
      }
      if (path.endsWith('/2.json')) {
        return JSON.stringify({
          id: 2,
          name: 'Missing cover',
          path: '/missing-cover',
          pluginId: 'source',
          cover: null,
          chapters: [],
        });
      }
      return '[]';
    });
    jest
      .mocked(NativeFile.exists)
      .mockImplementation(async path =>
        [
          '/cache/NovelAndChapters',
          '/cache/Covers/1',
          '/cache/Category.json',
        ].includes(path),
      );
    jest.mocked(NativeFile.readDir).mockResolvedValue([
      {
        name: '1.json',
        path: '/cache/NovelAndChapters/1.json',
        isDirectory: false,
      },
      {
        name: '2.json',
        path: '/cache/NovelAndChapters/2.json',
        isDirectory: false,
      },
    ]);

    await restoreData('/cache');

    expect(NativeFile.copyFile).toHaveBeenCalledWith(
      '/cache/Covers/1',
      '/storage/Novels/source/1/cover.png',
    );
    expect(_restoreNovelAndChapters).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        id: 1,
        cover: 'file:///storage/Novels/source/1/cover.png?123',
      }),
    );
    expect(_restoreNovelAndChapters).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: 2, cover: null }),
    );
  });

  it('omits the installed-plugin registry when plugin files are excluded', async () => {
    jest
      .mocked(MMKVStorage.getAllKeys)
      .mockReturnValueOnce(['INSTALL_PLUGINS', 'OTHER_SETTING']);
    jest
      .mocked(MMKVStorage.getString)
      .mockImplementation(key =>
        key === 'INSTALL_PLUGINS'
          ? '[{"id":"source"}]'
          : key === 'OTHER_SETTING'
          ? 'kept'
          : undefined,
      );

    await prepareBackupData('/cache', {
      library: false,
      settings: true,
      plugins: false,
      downloadedFiles: false,
      aiData: false,
    });

    const settingsWrite = jest
      .mocked(NativeFile.writeFile)
      .mock.calls.find(([path]) => path.endsWith('/Setting.json'));
    expect(JSON.parse(settingsWrite?.[1] ?? '{}')).toEqual({
      OTHER_SETTING: 'kept',
    });
  });

  it('treats backups without a section manifest as legacy full backups', async () => {
    jest
      .mocked(NativeFile.readFile)
      .mockResolvedValueOnce(JSON.stringify({ version: '2.0.0' }));

    const result = await restoreData('/cache');

    expect(result.manifest).toMatchObject({
      appVersion: '2.0.0',
      formatVersion: 1,
      sections: {
        library: true,
        settings: true,
        plugins: true,
        downloadedFiles: true,
        aiData: true,
      },
    });
  });

  it('writes AI recaps, summaries and chats when they are included', async () => {
    jest.mocked(getAllNovelRecaps).mockResolvedValueOnce([
      {
        id: 1,
        novelId: 5,
        summary: 'Previously, the hero left home.',
        upToChapterId: 10,
        chaptersCovered: 3,
        provider: 'provider',
        model: 'model',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    jest.mocked(getAllChapterSummaries).mockResolvedValueOnce([
      {
        id: 1,
        chapterId: 10,
        summary: 'Chapter summary',
        provider: 'provider',
        model: 'model',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    jest.mocked(getAllChapterChatMessages).mockResolvedValueOnce([
      {
        id: 1,
        chapterId: 10,
        role: 'user',
        content: 'who is the masked man?',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    await prepareBackupData('/cache', {
      library: true,
      settings: false,
      plugins: false,
      downloadedFiles: false,
      aiData: true,
    });

    const aiWrite = jest
      .mocked(NativeFile.writeFile)
      .mock.calls.find(([path]) => path.endsWith('/AiData.json'));
    expect(aiWrite).toBeDefined();
    expect(JSON.parse(aiWrite?.[1] ?? '{}')).toMatchObject({
      recaps: [{ novelId: 5, summary: 'Previously, the hero left home.' }],
      summaries: [{ chapterId: 10, summary: 'Chapter summary' }],
      messages: [{ chapterId: 10, content: 'who is the masked man?' }],
    });
  });

  it('remaps AI rows to the restored novel and chapter ids', async () => {
    const options: BackupOptions = {
      library: true,
      settings: false,
      plugins: false,
      downloadedFiles: false,
      aiData: true,
    };
    jest
      .mocked(NativeFile.exists)
      .mockImplementation(
        async path =>
          path.endsWith('/Version.json') ||
          path.endsWith('/AiData.json') ||
          path.endsWith('/NovelAndChapters'),
      );
    jest.mocked(NativeFile.readDir).mockResolvedValue([
      {
        path: '/cache/NovelAndChapters/5.json',
        isDirectory: false,
      },
    ] as never);
    jest.mocked(NativeFile.readFile).mockImplementation(async path => {
      if (path.endsWith('/Version.json')) {
        return JSON.stringify({
          appVersion: '2.1.6',
          formatVersion: 2,
          sections: options,
        });
      }
      if (path.endsWith('/AiData.json')) {
        return JSON.stringify({
          recaps: [{ id: 1, novelId: 5, summary: 'Previously…' }],
          summaries: [{ id: 1, chapterId: 10, summary: 'Chapter summary' }],
          messages: [
            { id: 1, chapterId: 10, role: 'user', content: 'who?' },
            { id: 1, chapterId: 999, role: 'user', content: 'dropped row' },
          ],
        });
      }
      return JSON.stringify({
        id: 5,
        name: 'Example',
        path: '/example',
        pluginId: 'source',
        chapters: [{ id: 10, path: '/chapter-1', name: 'Chapter 1' }],
      });
    });
    jest.mocked(_restoreNovelAndChapters).mockResolvedValueOnce({
      pluginId: 'source',
      backupNovelId: 5,
      restoredNovelId: 99,
      chapters: [{ backupChapterId: 10, restoredChapterId: 110 }],
    });

    const result = await restoreData('/cache');

    expect(result.failedSectionCount).toBeGreaterThanOrEqual(0);
    expect(importNovelRecaps).toHaveBeenCalledWith([
      expect.objectContaining({ novelId: 99, summary: 'Previously…' }),
    ]);
    expect(importChapterSummaries).toHaveBeenCalledWith([
      expect.objectContaining({ chapterId: 110, summary: 'Chapter summary' }),
    ]);
    expect(importChapterChatMessages).toHaveBeenCalledWith([
      expect.objectContaining({ chapterId: 110, content: 'who?' }),
    ]);
  });
});

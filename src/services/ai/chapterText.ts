import { ChapterInfo } from '@database/types';
import NativeFile from '@modules/native-file';
import { NOVEL_STORAGE } from '@utils/Storages';
import { htmlToPlainText } from './text';

/**
 * Returns the chapter body as plain text. Downloaded chapters are read from
 * disk; anything else is fetched through the plugin sandbox.
 */
export const getChapterPlainText = async (
  pluginId: string,
  chapter: ChapterInfo,
): Promise<string> => {
  const filePath = `${NOVEL_STORAGE}/${pluginId}/${chapter.novelId}/${chapter.id}/index.html`;
  try {
    return htmlToPlainText(await NativeFile.readFile(filePath));
  } catch {
    // Imported lazily so loading AI screens does not pull the plugin sandbox
    // (and its heavy dependencies) into the module graph.
    const { fetchChapter } = await import('@services/plugin/fetch');
    return htmlToPlainText(await fetchChapter(pluginId, chapter.path));
  }
};

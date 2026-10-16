import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { History } from '@database/types';

import {
  deleteAllHistory,
  deleteChapterHistory,
  deleteNovelHistory,
  getHistoryFromDb,
} from '@database/queries/HistoryQueries';
import { parseChapterNumber } from '@utils/parseChapterNumber';

const useHistory = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState<History[]>([]);
  const [error, setError] = useState<string>();

  const getHistory = useCallback(
    () =>
      getHistoryFromDb()
        .then(res =>
          setHistory(
            res.map(localHistory => {
              return {
                ...localHistory,
                chapterNumber: localHistory.chapterNumber
                  ? localHistory.chapterNumber
                  : parseChapterNumber(
                      localHistory.novelName,
                      localHistory.name,
                    ),
              };
            }),
          ),
        )
        .catch((err: Error) => setError(err.message))
        .finally(() => setIsLoading(false)),
    [],
  );

  const clearAllHistory = async () => {
    await deleteAllHistory();
    await getHistory();
  };

  const removeChapterFromHistory = async (chapterId: number) => {
    await deleteChapterHistory(chapterId);
    await getHistory();
  };

  const removeNovelFromHistory = async (novelId: number) => {
    await deleteNovelHistory(novelId);
    await getHistory();
  };

  useFocusEffect(
    useCallback(() => {
      void getHistory();
    }, [getHistory]),
  );

  return {
    isLoading,
    history,
    error,
    removeChapterFromHistory,
    removeNovelFromHistory,
    clearAllHistory,
  };
};

export default useHistory;

import type { TaskProgressUpdater } from '@services/backgroundTasks/contracts';

const PROGRESS_UPDATE_INTERVAL_MS = 250;

export const createImportProgressReporter = (
  updateProgress: TaskProgressUpdater,
  getCurrentTime: () => number = Date.now,
) => {
  let lastProgressUpdateAt = Number.NEGATIVE_INFINITY;

  return (
    completedChapters: number,
    totalChapters: number,
    chapterTitle: string,
  ) => {
    const now = getCurrentTime();
    if (
      completedChapters < totalChapters &&
      now - lastProgressUpdateAt < PROGRESS_UPDATE_INTERVAL_MS
    ) {
      return;
    }
    lastProgressUpdateAt = now;

    updateProgress(meta => ({
      ...meta,
      progress: completedChapters / Math.max(1, totalChapters),
      progressText: chapterTitle,
    }));
  };
};

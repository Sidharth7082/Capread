import type { BackgroundTaskMetadata } from '@services/backgroundTasks';
import { createImportProgressReporter } from '../importProgress';

describe('createImportProgressReporter', () => {
  it('coalesces rapid updates while preserving the first and final chapter', () => {
    let now = 1_000;
    let metadata: BackgroundTaskMetadata = {
      name: 'Importing EPUB',
      isRunning: true,
      progress: 0,
      progressText: undefined,
    };
    const snapshots: BackgroundTaskMetadata[] = [];
    const reportProgress = createImportProgressReporter(
      transformer => {
        metadata = transformer(metadata);
        snapshots.push(metadata);
      },
      () => now,
    );

    reportProgress(1, 4, 'Chapter 1');
    now += 100;
    reportProgress(2, 4, 'Chapter 2');
    now += 150;
    reportProgress(3, 4, 'Chapter 3');
    now += 1;
    reportProgress(4, 4, 'Chapter 4');

    expect(snapshots).toEqual([
      expect.objectContaining({
        progress: 0.25,
        progressText: 'Chapter 1',
      }),
      expect.objectContaining({
        progress: 0.75,
        progressText: 'Chapter 3',
      }),
      expect.objectContaining({
        progress: 1,
        progressText: 'Chapter 4',
      }),
    ]);
  });

  it('publishes the final chapter even within the throttle interval', () => {
    let now = 1_000;
    const updateProgress = jest.fn();
    const reportProgress = createImportProgressReporter(
      updateProgress,
      () => now,
    );

    reportProgress(1, 2, 'Chapter 1');
    now += 1;
    reportProgress(2, 2, 'Chapter 2');

    expect(updateProgress).toHaveBeenCalledTimes(2);
  });
});

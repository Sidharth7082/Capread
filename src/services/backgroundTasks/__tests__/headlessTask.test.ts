import NativeBackgroundTasks, {
  type NativeBackgroundTaskRecord,
} from '@modules/native-background-tasks';
import { initializeDatabase } from '@database/db';
import { initializeInstalledPlugins } from '@plugins/pluginManager';
import { backgroundTasks } from '../backgroundTasks';
import { runHeadlessBackgroundTask } from '../headlessTask';

jest.mock('@modules/native-background-tasks', () => ({
  __esModule: true,
  default: {
    fail: jest.fn().mockResolvedValue(undefined),
    getTask: jest.fn(),
  },
}));

jest.mock('@database/db', () => ({
  initializeDatabase: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@plugins/pluginManager', () => ({
  initializeInstalledPlugins: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../backgroundTasks', () => ({
  backgroundTasks: {
    run: jest.fn().mockResolvedValue(undefined),
  },
}));

const createRecord = (
  payload: string,
  checkpoint?: string,
): NativeBackgroundTaskRecord => ({
  id: 'task-1',
  type: 'EXPORT_EPUB',
  payload,
  title: 'Exporting EPUB',
  state: 'running',
  checkpoint,
  attempt: 1,
  createdAt: 1,
  updatedAt: 1,
});

describe('runHeadlessBackgroundTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the persisted task using only the task ID', async () => {
    const task = {
      name: 'LOCAL_RESTORE' as const,
      data: { sourceUri: 'file://backup.zip' },
    };
    jest
      .mocked(NativeBackgroundTasks.getTask)
      .mockResolvedValue(createRecord(JSON.stringify(task), 'checkpoint-1'));

    await runHeadlessBackgroundTask({ taskId: 'task-1' });

    expect(NativeBackgroundTasks.getTask).toHaveBeenCalledWith('task-1');
    expect(initializeDatabase).toHaveBeenCalledTimes(1);
    expect(initializeInstalledPlugins).toHaveBeenCalledTimes(1);
    expect(backgroundTasks.run).toHaveBeenCalledWith(
      'task-1',
      task,
      'checkpoint-1',
    );
  });

  it('loads payloads larger than the Binder transaction limit from storage', async () => {
    const task = {
      name: 'EXPORT_EPUB' as const,
      data: {
        novelName: 'Large Novel',
        chapters: [
          {
            title: 'Chapter',
            htmlPath: 'x'.repeat(1024 * 1024),
            novelId: '1',
            chapterId: '1',
          },
        ],
      },
    };
    const payload = JSON.stringify(task);
    expect(payload.length).toBeGreaterThan(1024 * 1024);
    jest
      .mocked(NativeBackgroundTasks.getTask)
      .mockResolvedValue(createRecord(payload));

    await runHeadlessBackgroundTask({ taskId: 'task-1' });

    expect(backgroundTasks.run).toHaveBeenCalledWith('task-1', task, undefined);
  });

  it('fails the native execution when task preparation fails', async () => {
    jest.mocked(NativeBackgroundTasks.getTask).mockResolvedValue(null);

    await expect(
      runHeadlessBackgroundTask({ taskId: 'missing-task' }),
    ).rejects.toThrow('Unknown background task: missing-task');

    expect(NativeBackgroundTasks.fail).toHaveBeenCalledWith(
      'missing-task',
      'Unknown background task: missing-task',
      false,
    );
    expect(backgroundTasks.run).not.toHaveBeenCalled();
  });
});

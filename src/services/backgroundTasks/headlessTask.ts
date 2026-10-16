import NativeBackgroundTasks from '@modules/native-background-tasks';
import { initializeDatabase } from '@database/db';
import { initializeInstalledPlugins } from '@plugins/pluginManager';
import type { BackgroundTask, HeadlessBackgroundTaskData } from './contracts';
import { backgroundTasks } from './backgroundTasks';

export const runHeadlessBackgroundTask = async ({
  taskId,
}: HeadlessBackgroundTaskData) => {
  let task: BackgroundTask;
  let checkpoint: string | undefined;

  try {
    const record = await NativeBackgroundTasks.getTask(taskId);
    if (!record) {
      throw new Error(`Unknown background task: ${taskId}`);
    }

    task = JSON.parse(record.payload) as BackgroundTask;
    checkpoint = record.checkpoint;
    await initializeDatabase();
    await initializeInstalledPlugins();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await NativeBackgroundTasks.fail(taskId, message, false);
    throw error;
  }

  await backgroundTasks.run(taskId, task, checkpoint);
};

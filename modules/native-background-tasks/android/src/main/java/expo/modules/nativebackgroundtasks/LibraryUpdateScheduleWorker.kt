package expo.modules.nativebackgroundtasks

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters

class LibraryUpdateScheduleWorker(
    appContext: Context,
    workerParams: WorkerParameters,
) : CoroutineWorker(appContext, workerParams) {
    override suspend fun doWork(): Result {
        val title = inputData.getString(LibraryUpdateScheduler.TITLE)
            ?: LibraryUpdateScheduler.DEFAULT_TITLE
        val description = inputData.getString(LibraryUpdateScheduler.DESCRIPTION)
            ?: LibraryUpdateScheduler.DEFAULT_DESCRIPTION

        return try {
            BackgroundTaskScheduler.enqueueLibraryUpdate(
                applicationContext,
                title,
                description,
            )
            Result.success()
        } catch (_: Exception) {
            Result.retry()
        }
    }
}

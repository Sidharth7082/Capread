package expo.modules.nativebackgroundtasks

import android.content.Context
import androidx.work.Constraints
import androidx.work.Data
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

object LibraryUpdateScheduler {
    const val TITLE = "title"
    const val DESCRIPTION = "description"
    const val DEFAULT_TITLE = "Updating Library"
    const val DEFAULT_DESCRIPTION = "Preparing"

    private const val WORK_NAME = "lnreader-automatic-library-update"
    private val allowedIntervals = setOf(12L, 24L, 48L, 72L, 168L)

    fun schedule(
        context: Context,
        intervalHours: Long,
        title: String,
        description: String,
    ) {
        require(intervalHours in allowedIntervals) {
            "Unsupported automatic library update interval: $intervalHours"
        }

        val request =
            PeriodicWorkRequestBuilder<LibraryUpdateScheduleWorker>(
                intervalHours,
                TimeUnit.HOURS,
            )
                .setInitialDelay(intervalHours, TimeUnit.HOURS)
                .setInputData(
                    Data.Builder()
                        .putString(TITLE, title)
                        .putString(DESCRIPTION, description)
                        .build(),
                )
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build(),
                )
                .build()

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            WORK_NAME,
            ExistingPeriodicWorkPolicy.CANCEL_AND_REENQUEUE,
            request,
        )
    }

    fun cancel(context: Context) {
        WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
    }
}

package com.notwhat.shared.notifications

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.PowerManager
import android.provider.Settings
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

private const val UNIQUE_WORK_NAME = "notwhat-order-sync"
private val MIN_PERIODIC_INTERVAL_MINUTES = 15L // WorkManager's floor for periodic work

/** Runs [BackgroundOrderSync] periodically while the app is backgrounded (15 min is Android's minimum). */
class OrderSyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result = try {
        BackgroundOrderSync.checkForUpdates()
        Result.success()
    } catch (error: Exception) {
        Result.retry()
    }
}

fun scheduleBackgroundOrderSync(context: Context) {
    val request = PeriodicWorkRequestBuilder<OrderSyncWorker>(MIN_PERIODIC_INTERVAL_MINUTES, TimeUnit.MINUTES).build()
    WorkManager.getInstance(context).enqueueUniquePeriodicWork(
        UNIQUE_WORK_NAME,
        ExistingPeriodicWorkPolicy.KEEP,
        request,
    )
}

/**
 * Doze/App Standby throttles or skips WorkManager jobs on many OEMs (Samsung/Xiaomi/etc.) unless
 * the app is exempt. Shows the system's own "allow unrestricted battery usage" dialog; no-ops if
 * already exempt.
 */
fun requestIgnoreBatteryOptimizationsIfNeeded(context: Context) {
    val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return
    if (powerManager.isIgnoringBatteryOptimizations(context.packageName)) return

    val intent = Intent(
        Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
        Uri.parse("package:${context.packageName}"),
    ).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK }

    runCatching { context.startActivity(intent) }
}


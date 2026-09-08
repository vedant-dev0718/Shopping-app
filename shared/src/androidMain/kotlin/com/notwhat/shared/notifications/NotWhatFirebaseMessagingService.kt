package com.notwhat.shared.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.notwhat.app.MainActivity

private const val CHANNEL_ID = "notwhat_default"
private const val CHANNEL_NAME = "NotWhat"

/**
 * Requires an Android app registered for this Firebase project (google-services.json);
 * see AndroidPushTokenBridgeRegistry / AndroidPendingDeepLinkRegistry for the Kotlin-side wiring.
 */
class NotWhatFirebaseMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        AndroidPushTokenBridgeRegistry.setToken(token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val title = message.notification?.title ?: message.data["title"] ?: return
        val subtitle = message.notification?.body ?: message.data["subtitle"] ?: ""
        showNotification(title, subtitle, message.data)
    }

    private fun showNotification(title: String, subtitle: String, data: Map<String, String>) {
        val context = applicationContext
        val notificationManager = context.getSystemService(NotificationManager::class.java)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            notificationManager.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_HIGH),
            )
        }

        val tapIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            data["orderId"]?.let { putExtra("orderId", it) }
            data["productId"]?.let { putExtra("productId", it) }
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            tapIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(subtitle)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        notificationManager.notify(System.currentTimeMillis().toInt(), notification)
    }
}

/** Reads the notification-tap intent extras MainActivity received and stashes the deep link. */
fun captureDeepLinkFromIntent(intent: Intent?) {
    val orderId = intent?.getStringExtra("orderId")
    val productId = intent?.getStringExtra("productId")

    when {
        orderId != null -> AndroidPendingDeepLinkRegistry.setRoute("order/$orderId")
        productId != null -> AndroidPendingDeepLinkRegistry.setRoute("product/$productId")
    }
}

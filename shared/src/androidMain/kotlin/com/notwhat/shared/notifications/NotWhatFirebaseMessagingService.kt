package com.notwhat.shared.notifications

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/**
 * Requires an Android app registered for this Firebase project (google-services.json);
 * see AndroidPushTokenBridgeRegistry / AndroidPendingDeepLinkRegistry for the Kotlin-side wiring.
 * Until then, LocalNotificationBridge covers the same notification UX from client-side polling.
 */
class NotWhatFirebaseMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        AndroidPushTokenBridgeRegistry.setToken(token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val title = message.notification?.title ?: message.data["title"] ?: return
        val subtitle = message.notification?.body ?: message.data["subtitle"] ?: ""
        AndroidNotificationPresenter.show(applicationContext, title, subtitle, message.data)
    }
}

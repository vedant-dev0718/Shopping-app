package com.notwhat.shared.notifications

/**
 * Reads the native push token (FCM on Android, APNs/FCM on iOS) registered by the host app.
 * Native code populates this via the platform-specific registry; Kotlin only reads it.
 */
expect object PushTokenBridge {
    val platform: String
    fun currentToken(): String?
}

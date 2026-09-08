package com.notwhat.shared.notifications

/**
 * Registry that Swift populates with the device's push token (FCM token, or raw
 * APNs token if FirebaseMessaging is not linked). [PushTokenBridge] reads it from Kotlin.
 */
object IosPushTokenBridgeRegistry {
    private var token: String? = null

    fun setToken(value: String?) {
        token = value
    }

    fun currentToken(): String? = token
}

actual object PushTokenBridge {
    actual val platform: String = "ios"

    actual fun currentToken(): String? = IosPushTokenBridgeRegistry.currentToken()
}

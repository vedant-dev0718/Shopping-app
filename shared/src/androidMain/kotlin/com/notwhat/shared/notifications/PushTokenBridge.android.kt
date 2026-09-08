package com.notwhat.shared.notifications

/**
 * Android FCM wiring lands in a later phase; stubbed so the shared module builds
 * on both targets today.
 */
object AndroidPushTokenBridgeRegistry {
    private var token: String? = null

    fun setToken(value: String?) {
        token = value
    }

    fun currentToken(): String? = token
}

actual object PushTokenBridge {
    actual val platform: String = "android"

    actual fun currentToken(): String? = AndroidPushTokenBridgeRegistry.currentToken()
}

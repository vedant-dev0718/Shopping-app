package com.notwhat.shared.notifications

/** Android tap-to-deeplink wiring lands with the Phase 4 FCM service; stubbed for now. */
object AndroidPendingDeepLinkRegistry {
    private var route: String? = null

    fun setRoute(value: String?) {
        route = value
    }

    fun consumeRoute(): String? {
        val current = route
        route = null
        return current
    }
}

actual object PendingDeepLinkBridge {
    actual fun consumeRoute(): String? = AndroidPendingDeepLinkRegistry.consumeRoute()
}

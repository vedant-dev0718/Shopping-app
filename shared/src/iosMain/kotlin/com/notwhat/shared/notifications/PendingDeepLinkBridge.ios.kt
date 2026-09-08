package com.notwhat.shared.notifications

/** Registry that Swift populates when a push notification is tapped. */
object IosPendingDeepLinkRegistry {
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
    actual fun consumeRoute(): String? = IosPendingDeepLinkRegistry.consumeRoute()
}

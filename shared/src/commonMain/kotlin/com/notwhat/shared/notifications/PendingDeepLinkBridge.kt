package com.notwhat.shared.notifications

/**
 * Reads a pending deep-link route captured when the user tapped a push notification
 * (app was backgrounded or killed). Native code populates this; Kotlin consumes it once.
 */
expect object PendingDeepLinkBridge {
    fun consumeRoute(): String?
}

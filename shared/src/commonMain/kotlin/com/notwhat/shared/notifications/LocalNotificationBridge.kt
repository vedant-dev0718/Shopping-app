package com.notwhat.shared.notifications

/**
 * Shows a title/subtitle notification immediately from the client, without any backend push
 * infrastructure. Used until Firebase credentials are available for real remote push.
 */
expect object LocalNotificationBridge {
    fun show(title: String, subtitle: String, data: Map<String, String> = emptyMap())
}

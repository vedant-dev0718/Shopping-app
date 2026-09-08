package com.notwhat.shared.notifications

import platform.Foundation.NSUUID
import platform.UserNotifications.UNMutableNotificationContent
import platform.UserNotifications.UNNotificationRequest
import platform.UserNotifications.UNUserNotificationCenter

actual object LocalNotificationBridge {
    actual fun show(title: String, subtitle: String, data: Map<String, String>) {
        val content = UNMutableNotificationContent().apply {
            setTitle(title)
            setBody(subtitle)
        }
        val request = UNNotificationRequest.requestWithIdentifier(
            identifier = NSUUID().UUIDString(),
            content = content,
            trigger = null,
        )
        UNUserNotificationCenter.currentNotificationCenter().addNotificationRequest(request, withCompletionHandler = null)
    }
}

package com.notwhat.shared.notifications

import com.notwhat.shared.auth.AndroidAppContextHolder

actual object LocalNotificationBridge {
    actual fun show(title: String, subtitle: String, data: Map<String, String>) {
        val context = AndroidAppContextHolder.appContext ?: return
        AndroidNotificationPresenter.show(context, title, subtitle, data)
    }
}

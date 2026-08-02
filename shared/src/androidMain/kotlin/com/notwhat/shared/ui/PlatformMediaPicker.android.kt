package com.notwhat.shared.ui

actual object PlatformMediaPicker {
    actual fun isAvailable(): Boolean = false
    actual fun launch(onResult: (videoUri: String?) -> Unit) { onResult(null) }
}

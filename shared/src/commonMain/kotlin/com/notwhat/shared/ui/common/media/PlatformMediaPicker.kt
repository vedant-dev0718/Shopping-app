package com.notwhat.shared.ui

/** Platform-specific video picker bridge. */
expect object PlatformMediaPicker {
    fun isAvailable(): Boolean
    fun launch(onResult: (videoUri: String?) -> Unit)
}

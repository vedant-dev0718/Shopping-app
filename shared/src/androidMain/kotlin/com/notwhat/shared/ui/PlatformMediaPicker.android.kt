package com.notwhat.shared.ui

actual object PlatformMediaPicker {
    actual fun isAvailable(): Boolean = AndroidMediaPickerBridgeRegistry.isVideoAvailable()

    actual fun launch(onResult: (videoUri: String?) -> Unit) = AndroidMediaPickerBridgeRegistry.launchVideo(onResult)
}

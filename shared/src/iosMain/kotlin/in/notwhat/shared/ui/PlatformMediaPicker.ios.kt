package com.notwhat.shared.ui

actual object PlatformMediaPicker {
    actual fun isAvailable(): Boolean = IosMediaPickerBridgeRegistry.isRegistered()
    actual fun launch(onResult: (videoUri: String?) -> Unit) = IosMediaPickerBridgeRegistry.launch(onResult)
}

package com.notwhat.shared.ui

actual object PlatformImagePicker {
    actual fun isAvailable(): Boolean = AndroidMediaPickerBridgeRegistry.isImageAvailable()

    actual fun launch(onResult: (imageUri: String?) -> Unit) = AndroidMediaPickerBridgeRegistry.launchImage(onResult)

    actual fun isMultiAvailable(): Boolean = AndroidMediaPickerBridgeRegistry.isMultiImageAvailable()

    actual fun launchMulti(onResult: (List<String>) -> Unit) = AndroidMediaPickerBridgeRegistry.launchMultiImage(onResult)
}

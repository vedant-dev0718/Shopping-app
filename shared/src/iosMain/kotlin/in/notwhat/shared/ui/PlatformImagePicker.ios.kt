package com.notwhat.shared.ui

actual object PlatformImagePicker {
    actual fun isAvailable(): Boolean = IosImagePickerBridgeRegistry.isRegistered()

    actual fun launch(onResult: (imageUri: String?) -> Unit) = IosImagePickerBridgeRegistry.launch(onResult)

    actual fun isMultiAvailable(): Boolean = IosImagePickerBridgeRegistry.isMultiRegistered()

    actual fun launchMulti(onResult: (List<String>) -> Unit) = IosImagePickerBridgeRegistry.launchMulti(onResult)
}

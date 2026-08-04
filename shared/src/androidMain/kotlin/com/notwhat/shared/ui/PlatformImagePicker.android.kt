package com.notwhat.shared.ui

actual object PlatformImagePicker {
    actual fun isAvailable(): Boolean = false

    actual fun launch(onResult: (imageUri: String?) -> Unit) {
        onResult(null)
    }

    fun isMultiAvailable(): Boolean = false

    fun launchMulti(onResult: (List<String>) -> Unit) {
        onResult(emptyList())
    }
}

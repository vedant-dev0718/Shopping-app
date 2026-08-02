package com.notwhat.shared.ui

/** Platform-specific image picker bridge (used for reel thumbnail selection). */
expect object PlatformImagePicker {
    fun isAvailable(): Boolean
    fun launch(onResult: (imageUri: String?) -> Unit)
}

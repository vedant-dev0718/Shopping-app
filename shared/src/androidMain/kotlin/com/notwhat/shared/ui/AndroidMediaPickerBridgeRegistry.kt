package com.notwhat.shared.ui

/**
 * Bridge between MainActivity's ActivityResultLauncher and KMP media picker callers.
 * MainActivity registers launchers once; KMP calls launch() from Compose.
 */
object AndroidMediaPickerBridgeRegistry {
    private var videoPickerHandler: ((callback: (String?) -> Unit) -> Unit)? = null
    private var imagePickerHandler: ((callback: (String?) -> Unit) -> Unit)? = null
    private var multiImagePickerHandler: ((callback: (List<String>) -> Unit) -> Unit)? = null

    fun registerVideoPicker(handler: (callback: (String?) -> Unit) -> Unit) {
        videoPickerHandler = handler
    }

    fun registerImagePicker(handler: (callback: (String?) -> Unit) -> Unit) {
        imagePickerHandler = handler
    }

    fun registerMultiImagePicker(handler: (callback: (List<String>) -> Unit) -> Unit) {
        multiImagePickerHandler = handler
    }

    fun isVideoAvailable(): Boolean = videoPickerHandler != null

    fun isImageAvailable(): Boolean = imagePickerHandler != null

    fun isMultiImageAvailable(): Boolean = multiImagePickerHandler != null

    fun launchVideo(onResult: (String?) -> Unit) {
        videoPickerHandler?.invoke(onResult) ?: onResult(null)
    }

    fun launchImage(onResult: (String?) -> Unit) {
        imagePickerHandler?.invoke(onResult) ?: onResult(null)
    }

    fun launchMultiImage(onResult: (List<String>) -> Unit) {
        multiImagePickerHandler?.invoke(onResult) ?: onResult(emptyList())
    }
}

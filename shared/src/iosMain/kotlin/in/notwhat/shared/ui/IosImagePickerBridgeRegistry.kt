package com.notwhat.shared.ui

/** Registry that Swift registers an image picker handler into for thumbnail selection. */
object IosImagePickerBridgeRegistry {
    private var handler: ((callback: (String?) -> Unit) -> Unit)? = null
    private var multiHandler: ((callback: (List<String>) -> Unit) -> Unit)? = null

    fun registerImagePicker(handler: ((callback: (String?) -> Unit) -> Unit)?) {
        this.handler = handler
    }

    fun registerImagePickerMulti(handler: ((callback: (List<String>) -> Unit) -> Unit)?) {
        this.multiHandler = handler
    }

    fun isRegistered(): Boolean = handler != null

    fun isMultiRegistered(): Boolean = multiHandler != null

    fun launch(onResult: (String?) -> Unit) {
        handler?.invoke(onResult) ?: onResult(null)
    }

    fun launchMulti(onResult: (List<String>) -> Unit) {
        multiHandler?.invoke(onResult) ?: onResult(emptyList())
    }
}

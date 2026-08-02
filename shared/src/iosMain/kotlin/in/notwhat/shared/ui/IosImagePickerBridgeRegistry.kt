package com.notwhat.shared.ui

/** Registry that Swift registers an image picker handler into for thumbnail selection. */
object IosImagePickerBridgeRegistry {

    private var handler: ((callback: (String?) -> Unit) -> Unit)? = null

    fun registerImagePicker(handler: ((callback: (String?) -> Unit) -> Unit)?) {
        this.handler = handler
    }

    fun isRegistered(): Boolean = handler != null

    fun launch(onResult: (String?) -> Unit) {
        handler?.invoke(onResult) ?: onResult(null)
    }
}

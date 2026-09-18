package com.notwhat.shared.ui

/**
 * Registry that Swift registers a video picker handler into.
 * KMP calls [launch]; Swift presents PHPickerViewController and invokes the callback.
 */
object IosMediaPickerBridgeRegistry {

    private var handler: ((callback: (String?) -> Unit) -> Unit)? = null

    fun registerVideoPicker(handler: ((callback: (String?) -> Unit) -> Unit)?) {
        this.handler = handler
    }

    fun isRegistered(): Boolean = handler != null

    fun launch(onResult: (String?) -> Unit) {
        handler?.invoke(onResult) ?: onResult(null)
    }
}

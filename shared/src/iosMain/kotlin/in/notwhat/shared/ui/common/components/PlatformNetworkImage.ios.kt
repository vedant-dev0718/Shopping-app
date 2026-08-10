package com.notwhat.shared.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.interop.UIKitView
import androidx.compose.ui.layout.ContentScale
import kotlinx.cinterop.ExperimentalForeignApi
import platform.Foundation.NSURL
import platform.Foundation.NSURLSession
import platform.Foundation.dataTaskWithURL
import platform.UIKit.UIImage
import platform.UIKit.UIImageView
import platform.UIKit.UIViewContentMode
import platform.darwin.dispatch_async
import platform.darwin.dispatch_get_main_queue

@OptIn(ExperimentalForeignApi::class)
@Composable
internal actual fun PlatformNetworkImage(
    url: String,
    contentDescription: String,
    modifier: Modifier,
    contentScale: ContentScale,
    onSuccess: (() -> Unit)?,
    onError: ((String) -> Unit)?,
) {
    var loadedImage by remember(url) { mutableStateOf<UIImage?>(null) }

    DisposableEffect(url) {
        loadedImage = null

        val nsUrl = NSURL.URLWithString(url)
        if (nsUrl == null) {
            onError?.invoke("invalid_url")
            onDispose { }
        } else {
            val task =
                NSURLSession.sharedSession.dataTaskWithURL(nsUrl) { data, _, error ->
                    dispatch_async(dispatch_get_main_queue()) {
                        when {
                            error != null -> {
                                onError?.invoke(error.localizedDescription ?: "network_error")
                            }

                            data == null -> {
                                onError?.invoke("empty_payload")
                            }

                            else -> {
                                val image = UIImage(data = data)
                                if (image != null) {
                                    loadedImage = image
                                    onSuccess?.invoke()
                                } else {
                                    onError?.invoke("decode_error")
                                }
                            }
                        }
                    }
                }
            task.resume()
            onDispose {
                task.cancel()
            }
        }
    }

    UIKitView(
        factory = {
            UIImageView().apply {
                clipsToBounds = true
                userInteractionEnabled = false
                contentMode =
                    if (contentScale ==
                        ContentScale.Crop
                    ) {
                        UIViewContentMode.UIViewContentModeScaleAspectFill
                    } else {
                        UIViewContentMode.UIViewContentModeScaleAspectFit
                    }
            }
        },
        update = { view ->
            view.image = loadedImage
            view.contentMode =
                if (contentScale ==
                    ContentScale.Crop
                ) {
                    UIViewContentMode.UIViewContentModeScaleAspectFill
                } else {
                    UIViewContentMode.UIViewContentModeScaleAspectFit
                }
        },
        modifier = modifier,
    )
}

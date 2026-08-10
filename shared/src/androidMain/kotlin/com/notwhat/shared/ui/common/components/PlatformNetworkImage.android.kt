package com.notwhat.shared.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import coil3.compose.AsyncImage
import coil3.compose.AsyncImagePainter
import coil3.request.ImageRequest

@Composable
internal actual fun PlatformNetworkImage(
    url: String,
    contentDescription: String,
    modifier: Modifier,
    contentScale: ContentScale,
    onSuccess: (() -> Unit)?,
    onError: ((String) -> Unit)?,
) {
    AsyncImage(
        model =
            ImageRequest
                .Builder(LocalContext.current)
                .data(url)
                .build(),
        contentDescription = contentDescription,
        modifier = modifier,
        contentScale = contentScale,
        onState = { state ->
            when (state) {
                is AsyncImagePainter.State.Success -> {
                    onSuccess?.invoke()
                }

                is AsyncImagePainter.State.Error -> {
                    val message = state.result.throwable.message ?: state.result.throwable::class.simpleName ?: "unknown"
                    onError?.invoke(message)
                }

                else -> {
                    Unit
                }
            }
        },
    )
}

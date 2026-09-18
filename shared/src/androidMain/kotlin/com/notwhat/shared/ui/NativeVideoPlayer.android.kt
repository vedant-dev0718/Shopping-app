package com.notwhat.shared.ui

import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView

@Composable
actual fun NativeVideoPlayer(
    uri: String,
    modifier: Modifier,
) {
    if (uri.isBlank() || uri.contains("example.com")) {
        Box(modifier = modifier.background(Color.Black))
        return
    }

    // Android emulator reaches host machine via 10.0.2.2, not localhost
    val resolvedUri = uri.replace("//localhost:", "//10.0.2.2:").replace("//127.0.0.1:", "//10.0.2.2:")

    val context = LocalContext.current
    var isBuffering by remember(resolvedUri) { mutableStateOf(true) }

    val exoPlayer =
        remember(resolvedUri) {
            try {
                ExoPlayer.Builder(context).build().apply {
                    setMediaItem(MediaItem.fromUri(Uri.parse(resolvedUri)))
                    repeatMode = ExoPlayer.REPEAT_MODE_ONE
                    prepare()
                    playWhenReady = true
                    addListener(
                        object : Player.Listener {
                            override fun onPlaybackStateChanged(state: Int) {
                                isBuffering = state == Player.STATE_BUFFERING || state == Player.STATE_IDLE
                            }
                        },
                    )
                }
            } catch (_: Exception) {
                null
            }
        }

    DisposableEffect(exoPlayer) {
        onDispose { exoPlayer?.release() }
    }

    if (exoPlayer == null) {
        Box(modifier = modifier.background(Color.Black))
        return
    }

    Box(modifier = modifier) {
        AndroidView(
            factory = { ctx ->
                PlayerView(ctx).apply {
                    player = exoPlayer
                    useController = false
                    resizeMode = AspectRatioFrameLayout.RESIZE_MODE_ZOOM
                }
            },
            modifier = Modifier.fillMaxSize().background(Color.Black),
        )
        if (isBuffering) {
            CircularProgressIndicator(
                color = Color.White.copy(alpha = 0.8f),
                strokeWidth = 3.dp,
                modifier = Modifier.size(48.dp).align(Alignment.Center),
            )
        }
    }
}

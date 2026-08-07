package com.notwhat.shared.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.interop.UIKitView
import kotlinx.cinterop.ExperimentalForeignApi
import platform.AVFoundation.AVLayerVideoGravityResizeAspectFill
import platform.AVFoundation.AVPlayer
import platform.AVFoundation.pause
import platform.AVFoundation.play
import platform.AVKit.AVPlayerViewController
import platform.Foundation.NSURL

@OptIn(ExperimentalForeignApi::class)
@Composable
actual fun NativeVideoPlayer(
    uri: String,
    modifier: Modifier,
) {
    // Guard: don't create AVPlayer for empty or clearly-fake URLs
    if (uri.isBlank() || uri.contains("example.com") || !uri.startsWith("http")) {
        return
    }

    val player: AVPlayer =
        remember(uri) {
            AVPlayer(uRL = NSURL(string = uri))
        }
    val playerVC =
        remember(player) {
            AVPlayerViewController().also { vc ->
                vc.player = player
                vc.showsPlaybackControls = true
                vc.videoGravity = AVLayerVideoGravityResizeAspectFill
            }
        }

    DisposableEffect(playerVC) {
        player.play()
        onDispose {
            player.pause()
            playerVC.player = null
        }
    }

    UIKitView(
        factory = { playerVC.view },
        modifier = modifier,
        update = {},
    )
}

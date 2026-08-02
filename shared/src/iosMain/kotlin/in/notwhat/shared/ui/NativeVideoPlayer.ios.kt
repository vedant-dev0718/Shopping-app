package com.notwhat.shared.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.interop.UIKitView
import kotlinx.cinterop.ExperimentalForeignApi
import platform.AVFoundation.AVPlayer
import platform.AVKit.AVPlayerViewController
import platform.Foundation.NSURL

@OptIn(ExperimentalForeignApi::class)
@Composable
actual fun NativeVideoPlayer(uri: String, modifier: Modifier) {
    val player = remember(uri) { AVPlayer(uRL = NSURL(string = uri)) }
    // Retain the view controller so it isn't deallocated between recompositions
    val playerVC = remember(player) {
        AVPlayerViewController().also { vc ->
            vc.player = player
            vc.showsPlaybackControls = true
        }
    }

    DisposableEffect(playerVC) {
        onDispose { playerVC.player = null }
    }

    UIKitView(
        factory = { playerVC.view },
        modifier = modifier,
        update = {},
    )
}

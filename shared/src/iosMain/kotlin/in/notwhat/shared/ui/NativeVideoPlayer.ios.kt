package com.notwhat.shared.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.interop.UIKitView
import androidx.compose.ui.unit.dp
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.withContext
import platform.AVFoundation.AVLayerVideoGravityResizeAspectFill
import platform.AVFoundation.AVPlayer
import platform.AVFoundation.AVPlayerTimeControlStatusWaitingToPlayAtSpecifiedRate
import platform.AVFoundation.pause
import platform.AVFoundation.play
import platform.AVFoundation.rate
import platform.AVFoundation.timeControlStatus
import platform.AVKit.AVPlayerViewController
import platform.CoreGraphics.CGRectMake
import platform.Foundation.NSData
import platform.Foundation.NSURL
import platform.Foundation.dataWithContentsOfURL
import platform.UIKit.UIImage
import platform.UIKit.UIImageView
import platform.UIKit.UIView
import platform.UIKit.UIViewAutoresizingFlexibleHeight
import platform.UIKit.UIViewAutoresizingFlexibleWidth
import platform.UIKit.UIViewContentMode

@OptIn(ExperimentalForeignApi::class)
@Composable
actual fun NativeVideoPlayer(
    uri: String,
    modifier: Modifier,
    onFirstFrame: () -> Unit,
    posterUrl: String,
) {
    // Skip empty URIs and demo-data placeholder URLs
    if (uri.isBlank() || uri.contains("example.com")) return

    // NSURL.URLWithString() returns nil for malformed URLs; AVPlayer crashes on nil input
    val nsUrl = remember(uri) { NSURL.URLWithString(uri) } ?: return

    val player: AVPlayer = remember(uri) { AVPlayer(uRL = nsUrl) }
    val posterView =
        remember(uri) {
            UIImageView(frame = CGRectMake(0.0, 0.0, 0.0, 0.0)).apply {
                contentMode = UIViewContentMode.UIViewContentModeScaleAspectFill
                clipsToBounds = true
                setAutoresizingMask(UIViewAutoresizingFlexibleWidth or UIViewAutoresizingFlexibleHeight)
            }
        }
    val playerVC =
        remember(player, posterView) {
            AVPlayerViewController().also { vc ->
                vc.player = player
                vc.showsPlaybackControls = false
                vc.videoGravity = AVLayerVideoGravityResizeAspectFill
                vc.view.backgroundColor = platform.UIKit.UIColor.clearColor
                vc.view.opaque = false
                val overlayView = vc.contentOverlayView ?: vc.view
                overlayView.addSubview(posterView)
                posterView.setFrame(overlayView.bounds)
                overlayView.bringSubviewToFront(posterView)
                posterView.hidden = false
            }
        }
    var isBuffering by remember(uri) { mutableStateOf(true) }
    var hasStartedPlayback by remember(uri) { mutableStateOf(false) }
    var waitingTicks by remember(uri) { mutableStateOf(0) }

    LaunchedEffect(uri, posterUrl) {
        posterView.hidden = false
        posterView.image = null
        if (posterUrl.isBlank()) return@LaunchedEffect
        val posterNsUrl = NSURL.URLWithString(posterUrl) ?: return@LaunchedEffect
        val data: NSData? = withContext(Dispatchers.Default) { NSData.dataWithContentsOfURL(posterNsUrl) }
        if (data != null && !hasStartedPlayback) {
            posterView.image = UIImage.imageWithData(data)
            val overlayView = playerVC.contentOverlayView ?: playerVC.view
            posterView.setFrame(overlayView.bounds)
            overlayView.bringSubviewToFront(posterView)
            posterView.hidden = false
        }
    }

    DisposableEffect(playerVC) {
        player.play()
        onDispose {
            player.pause()
            playerVC.player = null
            posterView.removeFromSuperview()
        }
    }

    LaunchedEffect(player) {
        while (isActive) {
            val waitingForData = player.timeControlStatus == AVPlayerTimeControlStatusWaitingToPlayAtSpecifiedRate
            val activelyPlaying = player.rate > 0.0

            if (activelyPlaying) {
                if (!hasStartedPlayback) {
                    hasStartedPlayback = true
                    posterView.hidden = true
                    onFirstFrame()
                }
            }

            waitingTicks = if (waitingForData && !activelyPlaying) waitingTicks + 1 else 0

            // Before first frame, keep the loader visible until playback actually starts.
            // After playback has started, only show it again for sustained buffering stalls.
            isBuffering =
                if (!hasStartedPlayback) {
                    true
                } else {
                    !activelyPlaying && waitingTicks >= 2
                }
            delay(200)
        }
    }

    Box(modifier = modifier) {
        UIKitView(
            factory = { playerVC.view },
            modifier = Modifier.fillMaxSize(),
        )
        if (isBuffering) {
            CircularProgressIndicator(
                color = Color.White.copy(alpha = 0.85f),
                strokeWidth = 3.dp,
                modifier = Modifier.size(42.dp).align(Alignment.Center),
            )
        }
    }
}

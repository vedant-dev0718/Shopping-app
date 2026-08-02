package com.notwhat.shared.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

/** Inline native video player composable. */
@Composable
expect fun NativeVideoPlayer(uri: String, modifier: Modifier = Modifier)

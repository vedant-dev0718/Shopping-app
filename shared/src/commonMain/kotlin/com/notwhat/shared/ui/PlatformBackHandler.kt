package com.notwhat.shared.ui

import androidx.compose.runtime.Composable

/** Intercepts system back button when [enabled]; no-op on iOS. */
@Composable
expect fun PlatformBackHandler(
    enabled: Boolean,
    onBack: () -> Unit,
)

package com.notwhat.shared.ui

import androidx.compose.runtime.Composable

@Composable
actual fun PlatformBackHandler(
    enabled: Boolean,
    onBack: () -> Unit,
) {
    // iOS handles back navigation via swipe gestures — no system back button to intercept
}

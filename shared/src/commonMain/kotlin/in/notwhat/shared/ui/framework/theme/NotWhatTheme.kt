package com.notwhat.shared.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

object NotWhatColors {
    val background = Color(0xFFFFFEF9)
    val onBackground = Color(0xFF2A2105)
    val primary = Color(0xFF8A6100)
    val onPrimary = Color(0xFFFFFFFF)
    val primaryContainer = Color(0xFFFFE08D)
    val onPrimaryContainer = Color(0xFF2A1B00)
    val secondaryContainer = Color(0xFFFFF4C6)
    val surface = Color(0xFFFFFFFF)
    val surfaceContainer = Color(0xFFFFF9E8)
    val surfaceContainerHigh = Color(0xFFFFF2D2)
    val surfaceVariant = Color(0xFFFFECC5)
    val outline = Color(0xFFB28B2D)
    val onSurface = Color(0xFF2A2105)
    val onSurfaceVariant = Color(0xFF5A4915)
}

private val NotWhatColorScheme = lightColorScheme(
    background = NotWhatColors.background,
    surface = NotWhatColors.surface,
    onSurface = NotWhatColors.onSurface,
    primary = NotWhatColors.primary,
    onPrimary = NotWhatColors.onPrimary,
    primaryContainer = NotWhatColors.primaryContainer,
    onPrimaryContainer = NotWhatColors.onPrimaryContainer,
    secondaryContainer = NotWhatColors.secondaryContainer,
    surfaceVariant = NotWhatColors.surfaceVariant,
    surfaceContainerHigh = NotWhatColors.surfaceContainerHigh,
    surfaceContainer = NotWhatColors.surfaceContainer,
    onBackground = NotWhatColors.onBackground,
    onSurfaceVariant = NotWhatColors.onSurfaceVariant,
    outline = NotWhatColors.outline,
)

@Composable
fun NotWhatTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = NotWhatColorScheme,
        typography = MaterialTheme.typography,
        content = content,
    )
}

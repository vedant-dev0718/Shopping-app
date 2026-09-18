package com.notwhat.shared.ui

actual object PlatformMediaFileReader {
    actual fun readBytes(uri: String): ByteArray? = null

    actual fun fileName(
        uri: String,
        fallback: String,
    ): String = fallback

    actual fun guessMimeType(
        uri: String,
        fallback: String,
    ): String = fallback
}

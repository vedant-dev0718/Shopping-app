package com.notwhat.shared.ui

/**
 * Platform bridge to read picked local media into bytes for multipart upload.
 */
expect object PlatformMediaFileReader {
    fun readBytes(uri: String): ByteArray?

    fun fileName(
        uri: String,
        fallback: String,
    ): String

    fun guessMimeType(
        uri: String,
        fallback: String,
    ): String
}

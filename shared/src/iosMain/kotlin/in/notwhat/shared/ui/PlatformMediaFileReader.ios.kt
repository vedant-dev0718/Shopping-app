package com.notwhat.shared.ui

import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.addressOf
import kotlinx.cinterop.usePinned
import platform.Foundation.NSData
import platform.Foundation.NSFileHandle
import platform.Foundation.NSURL
import platform.Foundation.dataWithContentsOfURL
import platform.Foundation.fileHandleForReadingAtPath
import platform.Foundation.lastPathComponent
import platform.Foundation.pathExtension
import platform.posix.memcpy

actual object PlatformMediaFileReader {
    actual fun readBytes(uri: String): ByteArray? {
        val url = NSURL.URLWithString(uri) ?: NSURL.fileURLWithPath(uri)
        val data = NSData.dataWithContentsOfURL(url) ?: return null
        return data.toByteArray()
    }

    actual fun fileName(
        uri: String,
        fallback: String,
    ): String {
        val fileName = NSURL.URLWithString(uri)?.lastPathComponent
        if (!fileName.isNullOrBlank()) {
            return fileName
        }
        return fallback
    }

    actual fun guessMimeType(
        uri: String,
        fallback: String,
    ): String {
        val extension = NSURL.URLWithString(uri)?.pathExtension?.lowercase() ?: return fallback
        return when (extension) {
            "mp4" -> "video/mp4"
            "mov" -> "video/quicktime"
            "m4v" -> "video/x-m4v"
            "jpg", "jpeg" -> "image/jpeg"
            "png" -> "image/png"
            "webp" -> "image/webp"
            else -> fallback
        }
    }
}

@OptIn(ExperimentalForeignApi::class)
private fun NSData.toByteArray(): ByteArray {
    val length = this.length.toInt()
    if (length == 0) {
        return ByteArray(0)
    }

    val output = ByteArray(length)
    output.usePinned { pinned ->
        memcpy(pinned.addressOf(0), bytes, this.length)
    }

    return output
}

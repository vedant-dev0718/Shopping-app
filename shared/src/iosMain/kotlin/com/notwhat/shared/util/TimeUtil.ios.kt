package com.notwhat.shared.util

import platform.CoreFoundation.CFAbsoluteTimeGetCurrent

actual fun getCurrentTimeMillis(): Long {
    // CFAbsoluteTimeGetCurrent returns seconds since 2001-01-01
    // Convert to milliseconds since 1970-01-01
    val absTime = CFAbsoluteTimeGetCurrent()
    val secondsSince1970 = absTime + 978307200.0 // Seconds between 1970 and 2001
    return (secondsSince1970 * 1000).toLong()
}

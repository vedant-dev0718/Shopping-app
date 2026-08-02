package com.notwhat.shared.util

import platform.Foundation.NSDate
import platform.Foundation.NSDateFormatter

actual object QaClockFormatter {
    actual fun nowHms(): String {
        val formatter = NSDateFormatter()
        formatter.dateFormat = "HH:mm:ss"
        return formatter.stringFromDate(NSDate())
    }
}
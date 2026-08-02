package com.notwhat.shared.util

import java.time.LocalTime
import java.time.format.DateTimeFormatter

actual object QaClockFormatter {
    private val formatter: DateTimeFormatter = DateTimeFormatter.ofPattern("HH:mm:ss")

    actual fun nowHms(): String = LocalTime.now().format(formatter)
}
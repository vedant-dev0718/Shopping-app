package com.notwhat.shared.util

expect fun getCurrentTimeMillis(): Long

fun toIso8601(ms: Long): String {
    val totalSeconds = ms / 1000
    val secondsInDay = totalSeconds % 86400
    val hour = (secondsInDay / 3600).toInt()
    val minute = ((secondsInDay % 3600) / 60).toInt()
    val second = (secondsInDay % 60).toInt()

    // Calculate date from seconds since epoch (more accurate)
    var daysSinceEpoch = totalSeconds / 86400
    var year = 1970
    
    // Adjust year
    while (true) {
        val daysInYear = if (isLeapYear(year)) 366L else 365L
        if (daysSinceEpoch < daysInYear) break
        daysSinceEpoch -= daysInYear
        year++
    }

    // Adjust month and day
    val daysInMonths = if (isLeapYear(year)) {
        longArrayOf(31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31)
    } else {
        longArrayOf(31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31)
    }
    
    var month = 0
    var day = daysSinceEpoch + 1
    for (i in daysInMonths.indices) {
        if (day <= daysInMonths[i]) {
            month = i + 1
            break
        }
        day -= daysInMonths[i]
    }

    val y = year.toString().padStart(4, '0')
    val mo = month.toString().padStart(2, '0')
    val d = day.toString().padStart(2, '0')
    val h = hour.toString().padStart(2, '0')
    val mi = minute.toString().padStart(2, '0')
    val s = second.toString().padStart(2, '0')
    return "$y-$mo-${d}T$h:$mi:$s.000Z"
}

private fun isLeapYear(year: Int): Boolean {
    return (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)
}

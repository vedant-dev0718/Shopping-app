package com.notwhat.shared.notifications

import kotlinx.serialization.Serializable

@Serializable
data class DeviceTokenRequestDto(
    val fcmToken: String,
    val platform: String,
    val appVersion: String? = null,
)

@Serializable
data class DeviceTokenResponseDto(
    val fcmToken: String = "",
    val platform: String = "",
)

@Serializable
data class DeviceTokenRemovedResponseDto(
    val removed: Boolean = false,
)

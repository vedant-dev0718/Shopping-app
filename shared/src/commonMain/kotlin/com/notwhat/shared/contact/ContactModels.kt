package com.notwhat.shared.contact

import kotlinx.serialization.Serializable

@Serializable
data class SupportRequestDto(
    val name: String,
    val email: String,
    val subject: String,
    val message: String,
    val orderNumber: String? = null,
)

@Serializable
data class SupportResponseDto(
    val ticketId: String? = null,
    val message: String? = null,
)

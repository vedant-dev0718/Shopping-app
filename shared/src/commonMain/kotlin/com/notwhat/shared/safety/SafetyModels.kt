package com.notwhat.shared.safety

import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonNames

@Serializable
data class CreateReportRequestDto(
    val targetType: String, // reel | product | comment | store | user
    val targetId: String,
    val reason: String, // spam | harassment | hate | nudity | violence | scam | counterfeit | self_harm | other
    val details: String? = null,
)

@OptIn(ExperimentalSerializationApi::class)
@Serializable
data class ReportResponseDto(
    @JsonNames("id", "_id") val id: String = "",
    val targetType: String = "",
    val targetId: String = "",
    val reason: String = "",
    val status: String = "pending",
)

@OptIn(ExperimentalSerializationApi::class)
@Serializable
data class BlockedUserDto(
    @JsonNames("id", "_id") val id: String = "",
    val name: String = "",
    val email: String? = null,
)

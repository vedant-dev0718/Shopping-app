package com.notwhat.shared.likes

import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonNames

@OptIn(ExperimentalSerializationApi::class)
@Serializable
data class LikeResponseDto(
    @JsonNames("reelId", "reel_id") val reelId: String = "",
    val liked: Boolean = false,
    val likeCount: Int = 0,
)

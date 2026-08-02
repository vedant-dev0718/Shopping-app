package com.notwhat.shared.comments

import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonNames

@Serializable
data class CommentAuthorDto(
    val name: String = "",
    val role: String = "",
)

@OptIn(ExperimentalSerializationApi::class)
@Serializable
data class CommentDto(
    @JsonNames("id", "_id") val id: String = "",
    val reelId: String = "",
    val userId: CommentAuthorDto? = null,
    val text: String = "",
    val createdAt: String? = null,
)

@Serializable
data class CreateCommentRequestDto(
    val text: String,
)

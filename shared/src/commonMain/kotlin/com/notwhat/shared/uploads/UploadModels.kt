package com.notwhat.shared.uploads

import kotlinx.serialization.Serializable

@Serializable
data class VideoUploadResponseDto(
    val videoUrl: String = "",
    val thumbnailUrl: String = "",
    val publicId: String = "",
)

@Serializable
data class ImageUploadResponseDto(
    val imageUrl: String = "",
    val publicId: String = "",
)

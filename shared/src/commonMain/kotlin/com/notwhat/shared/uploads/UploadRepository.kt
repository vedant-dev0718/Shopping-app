package com.notwhat.shared.uploads

import com.notwhat.shared.core.NetworkResult
import com.notwhat.shared.core.runCatchingNetwork
import com.notwhat.shared.network.ApiClient

/**
 * Media upload — POST /uploads/video (field: "video") and /uploads/image (field: "image").
 * Both endpoints require seller auth and multipart/form-data.
 */
class UploadRepository(
    private val client: ApiClient,
) {
    suspend fun uploadVideo(
        data: ByteArray,
        fileName: String,
        bearerToken: String,
        mimeType: String = "video/mp4",
    ): NetworkResult<VideoUploadResponseDto> =
        runCatchingNetwork {
            client.submitMultipart(
                path = "uploads/video",
                fieldName = "video",
                fileName = fileName,
                mimeType = mimeType,
                data = data,
                bearerToken = bearerToken,
            )
        }

    suspend fun uploadImage(
        data: ByteArray,
        fileName: String,
        bearerToken: String,
        mimeType: String = "image/jpeg",
    ): NetworkResult<ImageUploadResponseDto> =
        runCatchingNetwork {
            client.submitMultipart(
                path = "uploads/image",
                fieldName = "image",
                fileName = fileName,
                mimeType = mimeType,
                data = data,
                bearerToken = bearerToken,
            )
        }
}

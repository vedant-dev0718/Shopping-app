package com.notwhat.shared.comments

import com.notwhat.shared.core.NetworkResult
import com.notwhat.shared.core.runCatchingNetwork
import com.notwhat.shared.network.ApiClient

/** Reel comments — mounted at /reels/:id/comments on the backend. */
class CommentRepository(
    private val client: ApiClient,
) {
    /** GET is optionally authenticated; pass an empty string when unauthenticated. */
    suspend fun listComments(
        reelId: String,
        bearerToken: String = "",
    ): NetworkResult<List<CommentDto>> =
        runCatchingNetwork { client.get("reels/$reelId/comments", bearerToken = bearerToken.ifBlank { null }) }

    suspend fun createComment(
        reelId: String,
        request: CreateCommentRequestDto,
        bearerToken: String,
    ): NetworkResult<CommentDto> = runCatchingNetwork { client.post("reels/$reelId/comments", request, bearerToken) }
}

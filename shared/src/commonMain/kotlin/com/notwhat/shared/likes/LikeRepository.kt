package com.notwhat.shared.likes

import com.notwhat.shared.core.NetworkResult
import com.notwhat.shared.core.runCatchingNetwork
import com.notwhat.shared.network.ApiClient

/** Like/unlike a reel. Mounted at /reels/:id/like on the backend. */
class LikeRepository(
    private val client: ApiClient,
) {
    suspend fun likeReel(
        reelId: String,
        bearerToken: String,
    ): NetworkResult<LikeResponseDto> = runCatchingNetwork { client.post("reels/$reelId/like", emptyMap<String, String>(), bearerToken) }

    suspend fun unlikeReel(
        reelId: String,
        bearerToken: String,
    ): NetworkResult<LikeResponseDto> = runCatchingNetwork { client.delete("reels/$reelId/like", bearerToken = bearerToken) }
}

package com.notwhat.shared.catalog

import com.notwhat.shared.core.NetworkResult
import com.notwhat.shared.core.runCatchingNetwork
import com.notwhat.shared.network.ApiClient

/** Live-only repository for buyer and seller reel endpoints. */
class ReelRepository(private val client: ApiClient) {

    suspend fun listReels(
        category: String? = null,
        region: String? = null,
        page: Int = 1,
        limit: Int = 20,
    ): NetworkResult<List<ReelDto>> = runCatchingNetwork {
        client.get(
            path = "reels",
            params = mapOf(
                "category" to category,
                "region" to region,
                "page" to page.toString(),
                "limit" to limit.toString(),
            ),
        )
    }

    suspend fun getReel(id: String, bearerToken: String? = null): NetworkResult<ReelDto> =
        runCatchingNetwork { client.get("reels/$id", bearerToken = bearerToken) }

    suspend fun getTaggedProducts(reelId: String): NetworkResult<List<ProductDto>> =
        runCatchingNetwork { client.get("reels/$reelId/products") }

    suspend fun recordView(reelId: String, bearerToken: String? = null): NetworkResult<DeleteResponseDto> =
        runCatchingNetwork { client.post("reels/$reelId/view", emptyMap<String, String>(), bearerToken) }

    // Seller endpoints
    suspend fun listSellerReels(bearerToken: String): NetworkResult<List<ReelDto>> =
        runCatchingNetwork { client.get("seller/reels", bearerToken = bearerToken) }

    suspend fun createReel(request: CreateReelRequestDto, bearerToken: String): NetworkResult<ReelDto> =
        runCatchingNetwork { client.post("seller/reels", request, bearerToken) }

    suspend fun updateReel(id: String, request: UpdateReelRequestDto, bearerToken: String): NetworkResult<ReelDto> =
        runCatchingNetwork { client.patch("seller/reels/$id", request, bearerToken) }

    suspend fun deleteReel(id: String, bearerToken: String): NetworkResult<DeleteResponseDto> =
        runCatchingNetwork { client.delete("seller/reels/$id", bearerToken) }
}

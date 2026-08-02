package com.notwhat.shared.recommendations

import com.notwhat.shared.catalog.ProductDto
import com.notwhat.shared.catalog.ReelDto
import com.notwhat.shared.core.NetworkResult
import com.notwhat.shared.core.runCatchingNetwork
import com.notwhat.shared.network.ApiClient

/** Personalised recommendations — GET /recommendations/products|reels (requireBuyer). */
class RecommendationRepository(
    private val client: ApiClient,
) {
    suspend fun getRecommendedProducts(
        bearerToken: String,
        params: Map<String, String?> = emptyMap(),
    ): NetworkResult<List<ProductDto>> = runCatchingNetwork { client.get("recommendations/products", bearerToken, params) }

    suspend fun getRecommendedReels(
        bearerToken: String,
        params: Map<String, String?> = emptyMap(),
    ): NetworkResult<List<ReelDto>> = runCatchingNetwork { client.get("recommendations/reels", bearerToken, params) }
}

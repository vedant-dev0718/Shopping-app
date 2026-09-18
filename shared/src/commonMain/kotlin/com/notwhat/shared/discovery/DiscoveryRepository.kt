package com.notwhat.shared.discovery

import com.notwhat.shared.core.NetworkResult
import com.notwhat.shared.core.runCatchingNetwork
import com.notwhat.shared.network.ApiClient

/** Live-only repository for home feed, categories, regions, and featured stores. */
class DiscoveryRepository(
    private val client: ApiClient,
) {
    suspend fun getFeed(
        category: String? = null,
        region: String? = null,
        page: Int = 1,
        limit: Int = 20,
        bearerToken: String? = null,
    ): NetworkResult<List<FeedItemDto>> =
        runCatchingNetwork {
            client.get(
                path = "discovery/feed",
                bearerToken = bearerToken,
                params =
                    mapOf(
                        "category" to category,
                        "region" to region,
                        "page" to page.toString(),
                        "limit" to limit.toString(),
                    ),
            )
        }

    suspend fun getCategories(): NetworkResult<List<CategoryDto>> = runCatchingNetwork { client.get("discovery/categories") }

    suspend fun getRegions(): NetworkResult<List<RegionDto>> = runCatchingNetwork { client.get("discovery/regions") }

    suspend fun getFeaturedStores(bearerToken: String? = null): NetworkResult<List<FeaturedStoreDto>> =
        runCatchingNetwork {
            client.get("discovery/featured-stores", bearerToken = bearerToken)
        }
}

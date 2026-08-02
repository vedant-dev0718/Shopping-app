package com.notwhat.shared.search

import com.notwhat.shared.catalog.ProductDto
import com.notwhat.shared.catalog.ReelDto
import com.notwhat.shared.catalog.StoreDto
import com.notwhat.shared.core.NetworkResult
import com.notwhat.shared.core.runCatchingNetwork
import com.notwhat.shared.network.ApiClient

/** Live-only repository for all search endpoints. */
class SearchRepository(private val client: ApiClient) {

    suspend fun searchProducts(query: String, category: String? = null): NetworkResult<List<ProductDto>> =
        runCatchingNetwork {
            client.get(
                path = "search/products",
                params = mapOf("q" to query, "category" to category),
            )
        }

    suspend fun searchStores(query: String): NetworkResult<List<StoreDto>> =
        runCatchingNetwork {
            client.get(path = "search/stores", params = mapOf("q" to query))
        }

    suspend fun searchReels(query: String): NetworkResult<List<ReelDto>> =
        runCatchingNetwork {
            client.get(path = "search/reels", params = mapOf("q" to query))
        }
}

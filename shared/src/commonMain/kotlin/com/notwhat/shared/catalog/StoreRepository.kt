package com.notwhat.shared.catalog

import com.notwhat.shared.core.NetworkResult
import com.notwhat.shared.core.runCatchingNetwork
import com.notwhat.shared.network.ApiClient

/** Live-only repository for public store browsing and seller store management. */
class StoreRepository(private val client: ApiClient) {

    suspend fun listStores(
        category: String? = null,
        region: String? = null,
        page: Int = 1,
        limit: Int = 20,
    ): NetworkResult<List<StoreDto>> = runCatchingNetwork {
        client.get(
            path = "stores",
            params = mapOf(
                "category" to category,
                "region" to region,
                "page" to page.toString(),
                "limit" to limit.toString(),
            ),
        )
    }

    suspend fun getStore(id: String, bearerToken: String? = null): NetworkResult<StoreDto> =
        runCatchingNetwork { client.get("stores/$id", bearerToken = bearerToken) }

    suspend fun getStoreProducts(
        storeId: String,
        page: Int = 1,
        limit: Int = 20,
    ): NetworkResult<List<ProductDto>> = runCatchingNetwork {
        client.get(
            path = "stores/$storeId/products",
            params = mapOf("page" to page.toString(), "limit" to limit.toString()),
        )
    }

    suspend fun getStoreReels(
        storeId: String,
        page: Int = 1,
        limit: Int = 20,
    ): NetworkResult<List<ReelDto>> = runCatchingNetwork {
        client.get(
            path = "stores/$storeId/reels",
            params = mapOf("page" to page.toString(), "limit" to limit.toString()),
        )
    }

    suspend fun saveStore(id: String, bearerToken: String): NetworkResult<SaveProductResponseDto> =
        runCatchingNetwork { client.post("stores/$id/save", emptyMap<String, String>(), bearerToken) }

    suspend fun unsaveStore(id: String, bearerToken: String): NetworkResult<SaveProductResponseDto> =
        runCatchingNetwork { client.delete("stores/$id/save", bearerToken) }

    // Seller endpoints
    suspend fun getSellerStore(bearerToken: String): NetworkResult<StoreDto> =
        runCatchingNetwork { client.get("stores/seller/me", bearerToken = bearerToken) }

    suspend fun updateSellerStore(request: UpdateSellerStoreRequestDto, bearerToken: String): NetworkResult<StoreDto> =
        runCatchingNetwork { client.patch("stores/seller/me", request, bearerToken) }
}

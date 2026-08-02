package com.notwhat.shared.catalog

import com.notwhat.shared.core.NetworkResult
import com.notwhat.shared.core.runCatchingNetwork
import com.notwhat.shared.network.ApiClient

/** Live-only repository for buyer and seller product endpoints. */
class ProductRepository(private val client: ApiClient) {

    suspend fun listProducts(
        category: String? = null,
        region: String? = null,
        query: String? = null,
        page: Int = 1,
        limit: Int = 20,
    ): NetworkResult<List<ProductDto>> = runCatchingNetwork {
        client.get<List<ProductDto>>(
            path = "products",
            params = mapOf(
                "category" to category,
                "region" to region,
                "q" to query,
                "page" to page.toString(),
                "limit" to limit.toString(),
            ),
        )
    }

    suspend fun getProduct(id: String, bearerToken: String? = null): NetworkResult<ProductDto> =
        runCatchingNetwork { client.get("products/$id", bearerToken = bearerToken) }

    suspend fun getRelatedProducts(id: String): NetworkResult<List<ProductDto>> =
        runCatchingNetwork { client.get("products/$id/related") }

    suspend fun saveProduct(id: String, bearerToken: String): NetworkResult<SaveProductResponseDto> =
        runCatchingNetwork { client.post("products/$id/save", emptyMap<String, String>(), bearerToken) }

    suspend fun unsaveProduct(id: String, bearerToken: String): NetworkResult<SaveProductResponseDto> =
        runCatchingNetwork { client.delete("products/$id/save", bearerToken) }

    // Seller endpoints
    suspend fun listSellerProducts(bearerToken: String): NetworkResult<List<ProductDto>> =
        runCatchingNetwork { client.get("seller/products", bearerToken = bearerToken) }

    suspend fun createProduct(request: CreateProductRequestDto, bearerToken: String): NetworkResult<ProductDto> =
        runCatchingNetwork { client.post("seller/products", request, bearerToken) }

    suspend fun updateProduct(id: String, request: UpdateProductRequestDto, bearerToken: String): NetworkResult<ProductDto> =
        runCatchingNetwork { client.patch("seller/products/$id", request, bearerToken) }

    suspend fun deleteProduct(id: String, bearerToken: String): NetworkResult<DeleteResponseDto> =
        runCatchingNetwork { client.delete("seller/products/$id", bearerToken) }
}

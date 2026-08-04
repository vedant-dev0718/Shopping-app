package com.notwhat.shared.domain.catalog

import com.notwhat.shared.catalog.CreateProductRequestDto
import com.notwhat.shared.catalog.CreateReelRequestDto
import com.notwhat.shared.catalog.DeleteResponseDto
import com.notwhat.shared.catalog.ProductClickResponseDto
import com.notwhat.shared.catalog.ProductDto
import com.notwhat.shared.catalog.ProductRepository
import com.notwhat.shared.catalog.ReelDto
import com.notwhat.shared.catalog.ReelRepository
import com.notwhat.shared.catalog.ReelViewResponseDto
import com.notwhat.shared.catalog.SaveProductResponseDto
import com.notwhat.shared.catalog.StoreDto
import com.notwhat.shared.catalog.StoreRepository
import com.notwhat.shared.catalog.UpdateProductRequestDto
import com.notwhat.shared.catalog.UpdateReelRequestDto
import com.notwhat.shared.catalog.UpdateSellerStoreRequestDto
import com.notwhat.shared.core.AppConfig
import com.notwhat.shared.core.NetworkResult

class CatalogUseCase(
    private val config: AppConfig,
    private val productRepository: ProductRepository,
    private val reelRepository: ReelRepository,
    private val storeRepository: StoreRepository,
) {
    // Products
    suspend fun listProducts(
        category: String? = null,
        region: String? = null,
        query: String? = null,
    ): NetworkResult<List<ProductDto>> = productRepository.listProducts(category, region, query)

    suspend fun getProduct(
        id: String,
        bearerToken: String? = null,
    ): NetworkResult<ProductDto> = productRepository.getProduct(id, bearerToken)

    suspend fun getRelatedProducts(id: String): NetworkResult<List<ProductDto>> = productRepository.getRelatedProducts(id)

    suspend fun saveProduct(
        id: String,
        bearerToken: String,
    ): NetworkResult<SaveProductResponseDto> = productRepository.saveProduct(id, bearerToken)

    suspend fun unsaveProduct(
        id: String,
        bearerToken: String,
    ): NetworkResult<SaveProductResponseDto> = productRepository.unsaveProduct(id, bearerToken)

    suspend fun recordProductClick(
        id: String,
        bearerToken: String? = null,
    ): NetworkResult<ProductClickResponseDto> = productRepository.recordProductClick(id, bearerToken)

    suspend fun listSellerProducts(bearerToken: String): NetworkResult<List<ProductDto>> = productRepository.listSellerProducts(bearerToken)

    suspend fun createProduct(
        request: CreateProductRequestDto,
        bearerToken: String,
    ): NetworkResult<ProductDto> = productRepository.createProduct(request, bearerToken)

    suspend fun updateProduct(
        id: String,
        request: UpdateProductRequestDto,
        bearerToken: String,
    ): NetworkResult<ProductDto> = productRepository.updateProduct(id, request, bearerToken)

    suspend fun deleteProduct(
        id: String,
        bearerToken: String,
    ): NetworkResult<DeleteResponseDto> = productRepository.deleteProduct(id, bearerToken)

    // Reels
    suspend fun listReels(
        category: String? = null,
        region: String? = null,
    ): NetworkResult<List<ReelDto>> = reelRepository.listReels(category, region)

    suspend fun getReel(
        id: String,
        bearerToken: String? = null,
    ): NetworkResult<ReelDto> = reelRepository.getReel(id, bearerToken)

    suspend fun getTaggedProducts(reelId: String): NetworkResult<List<ProductDto>> = reelRepository.getTaggedProducts(reelId)

    suspend fun recordReelView(
        id: String,
        bearerToken: String? = null,
    ): NetworkResult<ReelViewResponseDto> = reelRepository.recordView(id, bearerToken)

    suspend fun listSellerReels(bearerToken: String): NetworkResult<List<ReelDto>> = reelRepository.listSellerReels(bearerToken)

    suspend fun createReel(
        request: CreateReelRequestDto,
        bearerToken: String,
    ): NetworkResult<ReelDto> = reelRepository.createReel(request, bearerToken)

    suspend fun updateReel(
        id: String,
        request: UpdateReelRequestDto,
        bearerToken: String,
    ): NetworkResult<ReelDto> = reelRepository.updateReel(id, request, bearerToken)

    suspend fun deleteReel(
        id: String,
        bearerToken: String,
    ): NetworkResult<DeleteResponseDto> = reelRepository.deleteReel(id, bearerToken)

    // Stores
    suspend fun listStores(
        category: String? = null,
        region: String? = null,
    ): NetworkResult<List<StoreDto>> = storeRepository.listStores(category, region)

    suspend fun getStore(
        id: String,
        bearerToken: String? = null,
    ): NetworkResult<StoreDto> = storeRepository.getStore(id, bearerToken)

    suspend fun getStoreProducts(storeId: String): NetworkResult<List<ProductDto>> = storeRepository.getStoreProducts(storeId)

    suspend fun getStoreReels(storeId: String): NetworkResult<List<ReelDto>> = storeRepository.getStoreReels(storeId)

    suspend fun getSellerStore(bearerToken: String): NetworkResult<StoreDto> = storeRepository.getSellerStore(bearerToken)

    suspend fun updateSellerStore(
        request: UpdateSellerStoreRequestDto,
        bearerToken: String,
    ): NetworkResult<StoreDto> = storeRepository.updateSellerStore(request, bearerToken)
}

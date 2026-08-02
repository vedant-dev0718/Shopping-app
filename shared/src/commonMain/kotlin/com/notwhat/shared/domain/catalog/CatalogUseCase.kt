package com.notwhat.shared.domain.catalog

import com.notwhat.shared.catalog.CreateProductRequestDto
import com.notwhat.shared.catalog.CreateReelRequestDto
import com.notwhat.shared.catalog.DeleteResponseDto
import com.notwhat.shared.catalog.ProductDto
import com.notwhat.shared.catalog.ProductRepository
import com.notwhat.shared.catalog.ReelDto
import com.notwhat.shared.catalog.ReelRepository
import com.notwhat.shared.catalog.SaveProductResponseDto
import com.notwhat.shared.catalog.StoreDto
import com.notwhat.shared.catalog.StoreRepository
import com.notwhat.shared.catalog.UpdateProductRequestDto
import com.notwhat.shared.catalog.UpdateReelRequestDto
import com.notwhat.shared.catalog.UpdateSellerStoreRequestDto
import com.notwhat.shared.catalog.seedProducts
import com.notwhat.shared.catalog.seedReels
import com.notwhat.shared.catalog.seedStores
import com.notwhat.shared.core.AppConfig
import com.notwhat.shared.core.NetworkResult

class CatalogUseCase(
    private val config: AppConfig,
    private val productRepository: ProductRepository,
    private val reelRepository: ReelRepository,
    private val storeRepository: StoreRepository,
) {
    // Products
    suspend fun listProducts(category: String? = null, region: String? = null, query: String? = null): NetworkResult<List<ProductDto>> {
        if (config.isMock) return NetworkResult.Success(seedProducts())
        return productRepository.listProducts(category, region, query)
    }

    suspend fun getProduct(id: String, bearerToken: String? = null): NetworkResult<ProductDto> {
        if (config.isMock) return NetworkResult.Success(seedProducts().firstOrNull { it.id == id } ?: seedProducts().first())
        return productRepository.getProduct(id, bearerToken)
    }

    suspend fun getRelatedProducts(id: String): NetworkResult<List<ProductDto>> {
        if (config.isMock) return NetworkResult.Success(seedProducts().filter { it.id != id })
        return productRepository.getRelatedProducts(id)
    }

    suspend fun saveProduct(id: String, bearerToken: String): NetworkResult<SaveProductResponseDto> {
        if (config.isMock) return NetworkResult.Success(SaveProductResponseDto(isSaved = true))
        return productRepository.saveProduct(id, bearerToken)
    }

    suspend fun unsaveProduct(id: String, bearerToken: String): NetworkResult<SaveProductResponseDto> {
        if (config.isMock) return NetworkResult.Success(SaveProductResponseDto(isSaved = false))
        return productRepository.unsaveProduct(id, bearerToken)
    }

    suspend fun listSellerProducts(bearerToken: String): NetworkResult<List<ProductDto>> {
        if (config.isMock) return NetworkResult.Success(seedProducts())
        return productRepository.listSellerProducts(bearerToken)
    }

    suspend fun createProduct(request: CreateProductRequestDto, bearerToken: String): NetworkResult<ProductDto> {
        if (config.isMock) return NetworkResult.Success(seedProducts().first().copy(title = request.title, price = request.price))
        return productRepository.createProduct(request, bearerToken)
    }

    suspend fun updateProduct(id: String, request: UpdateProductRequestDto, bearerToken: String): NetworkResult<ProductDto> {
        if (config.isMock) return NetworkResult.Success(seedProducts().first().copy(id = id))
        return productRepository.updateProduct(id, request, bearerToken)
    }

    suspend fun deleteProduct(id: String, bearerToken: String): NetworkResult<DeleteResponseDto> {
        if (config.isMock) return NetworkResult.Success(DeleteResponseDto(deleted = true))
        return productRepository.deleteProduct(id, bearerToken)
    }

    // Reels
    suspend fun listReels(category: String? = null, region: String? = null): NetworkResult<List<ReelDto>> {
        if (config.isMock) return NetworkResult.Success(seedReels())
        return reelRepository.listReels(category, region)
    }

    suspend fun getReel(id: String, bearerToken: String? = null): NetworkResult<ReelDto> {
        if (config.isMock) return NetworkResult.Success(seedReels().firstOrNull { it.id == id } ?: seedReels().first())
        return reelRepository.getReel(id, bearerToken)
    }

    suspend fun getTaggedProducts(reelId: String): NetworkResult<List<ProductDto>> {
        if (config.isMock) return NetworkResult.Success(seedProducts().take(1))
        return reelRepository.getTaggedProducts(reelId)
    }

    suspend fun listSellerReels(bearerToken: String): NetworkResult<List<ReelDto>> {
        if (config.isMock) return NetworkResult.Success(seedReels())
        return reelRepository.listSellerReels(bearerToken)
    }

    suspend fun createReel(request: CreateReelRequestDto, bearerToken: String): NetworkResult<ReelDto> {
        if (config.isMock) return NetworkResult.Success(seedReels().first().copy(videoUrl = request.videoUrl))
        return reelRepository.createReel(request, bearerToken)
    }

    suspend fun updateReel(id: String, request: UpdateReelRequestDto, bearerToken: String): NetworkResult<ReelDto> {
        if (config.isMock) return NetworkResult.Success(seedReels().first().copy(id = id))
        return reelRepository.updateReel(id, request, bearerToken)
    }

    suspend fun deleteReel(id: String, bearerToken: String): NetworkResult<DeleteResponseDto> {
        if (config.isMock) return NetworkResult.Success(DeleteResponseDto(deleted = true))
        return reelRepository.deleteReel(id, bearerToken)
    }

    // Stores
    suspend fun listStores(category: String? = null, region: String? = null): NetworkResult<List<StoreDto>> {
        if (config.isMock) return NetworkResult.Success(seedStores())
        return storeRepository.listStores(category, region)
    }

    suspend fun getStore(id: String, bearerToken: String? = null): NetworkResult<StoreDto> {
        if (config.isMock) return NetworkResult.Success(seedStores().firstOrNull { it.id == id } ?: seedStores().first())
        return storeRepository.getStore(id, bearerToken)
    }

    suspend fun getStoreProducts(storeId: String): NetworkResult<List<ProductDto>> {
        if (config.isMock) return NetworkResult.Success(seedProducts().filter { it.storeId?.id == storeId })
        return storeRepository.getStoreProducts(storeId)
    }

    suspend fun getStoreReels(storeId: String): NetworkResult<List<ReelDto>> {
        if (config.isMock) return NetworkResult.Success(seedReels().filter { it.storeId?.id == storeId })
        return storeRepository.getStoreReels(storeId)
    }

    suspend fun getSellerStore(bearerToken: String): NetworkResult<StoreDto> {
        if (config.isMock) return NetworkResult.Success(seedStores().first())
        return storeRepository.getSellerStore(bearerToken)
    }

    suspend fun updateSellerStore(request: UpdateSellerStoreRequestDto, bearerToken: String): NetworkResult<StoreDto> {
        if (config.isMock) return NetworkResult.Success(seedStores().first())
        return storeRepository.updateSellerStore(request, bearerToken)
    }
}

package com.notwhat.shared.domain.seller

import com.notwhat.shared.catalog.CreateProductRequestDto
import com.notwhat.shared.catalog.CreateReelRequestDto
import com.notwhat.shared.catalog.DeleteResponseDto
import com.notwhat.shared.catalog.ProductDto
import com.notwhat.shared.catalog.ReelDto
import com.notwhat.shared.catalog.UpdateProductRequestDto
import com.notwhat.shared.catalog.UpdateReelRequestDto
import com.notwhat.shared.catalog.seedProducts
import com.notwhat.shared.catalog.seedReels
import com.notwhat.shared.core.AppConfig
import com.notwhat.shared.core.NetworkResult
import com.notwhat.shared.domain.catalog.CatalogUseCase
import com.notwhat.shared.order.OrderDto
import com.notwhat.shared.seller.SellerOrderRepository
import com.notwhat.shared.seller.ShipOrderRequestDto
import com.notwhat.shared.seller.seedSellerOrders

class SellerUseCase(
    private val config: AppConfig,
    private val catalogUseCase: CatalogUseCase,
    private val sellerOrderRepository: SellerOrderRepository,
) {
    // Products
    suspend fun listProducts(bearerToken: String): NetworkResult<List<ProductDto>> {
        if (config.isMock) return NetworkResult.Success(seedProducts())
        return catalogUseCase.listSellerProducts(bearerToken)
    }

    suspend fun createProduct(
        request: CreateProductRequestDto,
        bearerToken: String,
    ): NetworkResult<ProductDto> {
        if (config.isMock) return NetworkResult.Success(seedProducts().first().copy(title = request.title, price = request.price))
        return catalogUseCase.createProduct(request, bearerToken)
    }

    suspend fun updateProduct(
        id: String,
        request: UpdateProductRequestDto,
        bearerToken: String,
    ): NetworkResult<ProductDto> {
        if (config.isMock) return NetworkResult.Success(seedProducts().first().copy(id = id))
        return catalogUseCase.updateProduct(id, request, bearerToken)
    }

    suspend fun deleteProduct(
        id: String,
        bearerToken: String,
    ): NetworkResult<DeleteResponseDto> {
        if (config.isMock) return NetworkResult.Success(DeleteResponseDto(deleted = true))
        return catalogUseCase.deleteProduct(id, bearerToken)
    }

    // Reels
    suspend fun listReels(bearerToken: String): NetworkResult<List<ReelDto>> {
        if (config.isMock) return NetworkResult.Success(seedReels())
        return catalogUseCase.listSellerReels(bearerToken)
    }

    suspend fun deleteReel(
        id: String,
        bearerToken: String,
    ): NetworkResult<DeleteResponseDto> {
        if (config.isMock) return NetworkResult.Success(DeleteResponseDto(deleted = true))
        return catalogUseCase.deleteReel(id, bearerToken)
    }

    suspend fun createReel(
        request: CreateReelRequestDto,
        bearerToken: String,
    ): NetworkResult<ReelDto> {
        if (config.isMock) {
            return NetworkResult.Success(
                seedReels().first().copy(
                    caption = request.caption,
                    videoUrl = request.videoUrl,
                    thumbnailUrl = request.thumbnailUrl,
                    taggedProducts = seedProducts().filter { request.taggedProductIds.contains(it.id) },
                ),
            )
        }
        return catalogUseCase.createReel(request, bearerToken)
    }

    suspend fun updateReel(
        id: String,
        request: UpdateReelRequestDto,
        bearerToken: String,
    ): NetworkResult<ReelDto> {
        if (config.isMock) {
            val seedReel = seedReels().first().copy(id = id)
            return NetworkResult.Success(
                seedReel.copy(
                    caption = request.caption ?: seedReel.caption,
                    hashtags = request.hashtags ?: seedReel.hashtags,
                    taggedProducts =
                        request.taggedProductIds?.let { ids ->
                            seedProducts().filter { ids.contains(it.id) }
                        } ?: seedReel.taggedProducts,
                ),
            )
        }
        return catalogUseCase.updateReel(id, request, bearerToken)
    }

    // Orders
    suspend fun listOrders(bearerToken: String): NetworkResult<List<OrderDto>> {
        if (config.isMock) return NetworkResult.Success(seedSellerOrders())
        return sellerOrderRepository.listOrders(bearerToken)
    }

    suspend fun acceptOrder(
        orderId: String,
        bearerToken: String,
    ): NetworkResult<OrderDto> {
        if (config.isMock) return NetworkResult.Success(seedSellerOrders().first().copy(status = "accepted"))
        return sellerOrderRepository.acceptOrder(orderId, bearerToken)
    }

    suspend fun shipOrder(
        orderId: String,
        trackingNumber: String,
        bearerToken: String,
    ): NetworkResult<OrderDto> {
        if (config.isMock) return NetworkResult.Success(seedSellerOrders().first().copy(status = "shipped"))
        return sellerOrderRepository.shipOrder(orderId, ShipOrderRequestDto(trackingNumber), bearerToken)
    }
}

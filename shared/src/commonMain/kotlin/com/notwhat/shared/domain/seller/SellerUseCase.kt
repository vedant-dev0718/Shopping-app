package com.notwhat.shared.domain.seller

import com.notwhat.shared.catalog.CreateProductRequestDto
import com.notwhat.shared.catalog.CreateReelRequestDto
import com.notwhat.shared.catalog.DeleteResponseDto
import com.notwhat.shared.catalog.ProductDto
import com.notwhat.shared.catalog.ReelDto
import com.notwhat.shared.catalog.UpdateProductRequestDto
import com.notwhat.shared.catalog.UpdateReelRequestDto
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
    suspend fun listProducts(bearerToken: String): NetworkResult<List<ProductDto>> = catalogUseCase.listSellerProducts(bearerToken)

    suspend fun createProduct(
        request: CreateProductRequestDto,
        bearerToken: String,
    ): NetworkResult<ProductDto> = catalogUseCase.createProduct(request, bearerToken)

    suspend fun updateProduct(
        id: String,
        request: UpdateProductRequestDto,
        bearerToken: String,
    ): NetworkResult<ProductDto> = catalogUseCase.updateProduct(id, request, bearerToken)

    suspend fun deleteProduct(
        id: String,
        bearerToken: String,
    ): NetworkResult<DeleteResponseDto> = catalogUseCase.deleteProduct(id, bearerToken)

    // Reels
    suspend fun listReels(bearerToken: String): NetworkResult<List<ReelDto>> = catalogUseCase.listSellerReels(bearerToken)

    suspend fun deleteReel(
        id: String,
        bearerToken: String,
    ): NetworkResult<DeleteResponseDto> = catalogUseCase.deleteReel(id, bearerToken)

    suspend fun createReel(
        request: CreateReelRequestDto,
        bearerToken: String,
    ): NetworkResult<ReelDto> = catalogUseCase.createReel(request, bearerToken)

    suspend fun updateReel(
        id: String,
        request: UpdateReelRequestDto,
        bearerToken: String,
    ): NetworkResult<ReelDto> = catalogUseCase.updateReel(id, request, bearerToken)

    // Orders
    suspend fun listOrders(bearerToken: String): NetworkResult<List<OrderDto>> =
        if (config.isMock) {
            NetworkResult.Success(seedSellerOrders())
        } else {
            sellerOrderRepository.listOrders(bearerToken)
        }

    suspend fun acceptOrder(
        orderId: String,
        bearerToken: String,
    ): NetworkResult<OrderDto> = sellerOrderRepository.acceptOrder(orderId, bearerToken)

    suspend fun rejectOrder(
        orderId: String,
        reason: String,
        messageToBuyer: String,
        bearerToken: String,
    ): NetworkResult<OrderDto> = sellerOrderRepository.rejectOrder(orderId, reason, messageToBuyer, bearerToken)

    suspend fun shipOrder(
        orderId: String,
        trackingNumber: String,
        bearerToken: String,
    ): NetworkResult<OrderDto> = sellerOrderRepository.shipOrder(orderId, ShipOrderRequestDto(trackingNumber), bearerToken)

    suspend fun markDelivered(
        orderId: String,
        bearerToken: String,
    ): NetworkResult<OrderDto> = sellerOrderRepository.markDelivered(orderId, bearerToken)
}

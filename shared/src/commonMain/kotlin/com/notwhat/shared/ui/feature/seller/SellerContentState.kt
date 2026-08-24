package com.notwhat.shared.ui

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.notwhat.shared.bargain.BargainRepository
import com.notwhat.shared.bargain.BidDto
import com.notwhat.shared.bargain.ScheduleBargainRequestDto
import com.notwhat.shared.catalog.CreateProductRequestDto
import com.notwhat.shared.catalog.CreateReelRequestDto
import com.notwhat.shared.catalog.DeleteResponseDto
import com.notwhat.shared.catalog.ProductDto
import com.notwhat.shared.catalog.ReelDto
import com.notwhat.shared.catalog.UpdateProductRequestDto
import com.notwhat.shared.catalog.UpdateReelRequestDto
import com.notwhat.shared.catalog.seedProducts
import com.notwhat.shared.catalog.seedReels
import com.notwhat.shared.core.NetworkResult
import com.notwhat.shared.domain.seller.SellerUseCase
import com.notwhat.shared.order.OrderDto
import com.notwhat.shared.seller.seedSellerOrders
import com.notwhat.shared.uploads.ImageUploadResponseDto
import com.notwhat.shared.uploads.UploadRepository
import com.notwhat.shared.uploads.VideoUploadResponseDto

internal class SellerContentState(
    private val sellerUseCase: SellerUseCase,
    private val uploadRepository: UploadRepository,
    private val bargainRepository: BargainRepository? = null,
) {
    var products by mutableStateOf<List<ProductDto>>(emptyList())
        private set
    var reels by mutableStateOf<List<ReelDto>>(emptyList())
        private set
    var orders by mutableStateOf<List<OrderDto>>(emptyList())
        private set
    var isLoading by mutableStateOf(false)
        private set
    var loadErrorMessage by mutableStateOf<String?>(null)
        private set

    suspend fun load(bearerToken: String) {
        isLoading = true
        loadErrorMessage = null
        var firstError: String? = null
        try {
            when (val result = sellerUseCase.listProducts(bearerToken)) {
                is NetworkResult.Success -> products = result.data
                is NetworkResult.Failure -> firstError = result.error.userMessage()
            }
            when (val result = sellerUseCase.listReels(bearerToken)) {
                is NetworkResult.Success -> reels = result.data
                is NetworkResult.Failure -> if (firstError == null) firstError = result.error.userMessage()
            }
            when (val result = sellerUseCase.listOrders(bearerToken)) {
                is NetworkResult.Success -> orders = result.data
                is NetworkResult.Failure -> if (firstError == null) firstError = result.error.userMessage()
            }
            loadErrorMessage = firstError
        } finally {
            isLoading = false
        }
    }

    /** Re-fetches orders after a status change. */
    suspend fun refreshOrders(bearerToken: String) {
        orders = sellerUseCase.listOrders(bearerToken).getOrNull() ?: orders
    }

    private suspend fun refreshProducts(bearerToken: String) {
        products = sellerUseCase.listProducts(bearerToken).getOrNull() ?: products
    }

    suspend fun acceptOrder(
        orderId: String,
        bearerToken: String,
    ) = sellerUseCase.acceptOrder(orderId, bearerToken).also {
        if (it is com.notwhat.shared.core.NetworkResult.Success) {
            refreshOrders(bearerToken)
            refreshProducts(bearerToken)
        }
    }

    suspend fun rejectOrder(
        orderId: String,
        reason: String,
        message: String,
        bearerToken: String,
    ) = sellerUseCase.rejectOrder(orderId, reason, message, bearerToken).also {
        if (it is com.notwhat.shared.core.NetworkResult.Success) {
            refreshOrders(bearerToken)
            refreshProducts(bearerToken)
        }
    }

    suspend fun shipOrder(
        orderId: String,
        trackingNumber: String,
        bearerToken: String,
    ) = sellerUseCase.shipOrder(orderId, trackingNumber, bearerToken).also {
        if (it is com.notwhat.shared.core.NetworkResult.Success) refreshOrders(bearerToken)
    }

    suspend fun markDelivered(
        orderId: String,
        bearerToken: String,
    ) = sellerUseCase.markDelivered(orderId, bearerToken).also {
        if (it is com.notwhat.shared.core.NetworkResult.Success) {
            refreshOrders(bearerToken)
            refreshProducts(bearerToken)
        }
    }

    /** Removes product optimistically, re-fetches on error. */
    fun removeProductLocally(id: String) {
        products = products.filterNot { it.id == id }
    }

    fun updateProductLocally(product: ProductDto) {
        products = listOf(product) + products.filterNot { it.id == product.id }
    }

    /** Removes reel optimistically. */
    fun removeReelLocally(id: String) {
        reels = reels.filterNot { it.id == id }
    }

    fun updateReelLocally(reel: ReelDto) {
        reels = listOf(reel) + reels.filterNot { it.id == reel.id }
    }

    suspend fun uploadVideo(
        data: ByteArray,
        fileName: String,
        bearerToken: String,
        mimeType: String,
    ): NetworkResult<VideoUploadResponseDto> = uploadRepository.uploadVideo(data, fileName, bearerToken, mimeType)

    suspend fun uploadImage(
        data: ByteArray,
        fileName: String,
        bearerToken: String,
        mimeType: String,
    ): NetworkResult<ImageUploadResponseDto> = uploadRepository.uploadImage(data, fileName, bearerToken, mimeType)

    suspend fun createProduct(
        request: CreateProductRequestDto,
        bearerToken: String,
    ): NetworkResult<ProductDto> {
        val result = sellerUseCase.createProduct(request, bearerToken)
        result.getOrNull()?.let(::updateProductLocally)
        return result
    }

    suspend fun updateProduct(
        id: String,
        request: UpdateProductRequestDto,
        bearerToken: String,
    ): NetworkResult<ProductDto> {
        val result = sellerUseCase.updateProduct(id, request, bearerToken)
        result.getOrNull()?.let(::updateProductLocally)
        return result
    }

    suspend fun deleteProduct(
        id: String,
        bearerToken: String,
    ): NetworkResult<DeleteResponseDto> {
        val result = sellerUseCase.deleteProduct(id, bearerToken)
        if (result.getOrNull()?.deleted == true) {
            removeProductLocally(id)
        }
        return result
    }

    suspend fun createReel(
        request: CreateReelRequestDto,
        bearerToken: String,
    ): NetworkResult<ReelDto> {
        val result = sellerUseCase.createReel(request, bearerToken)
        result.getOrNull()?.let { created ->
            updateReelLocally(created)
        }
        return result
    }

    suspend fun updateReel(
        id: String,
        request: UpdateReelRequestDto,
        bearerToken: String,
    ): NetworkResult<ReelDto> {
        val result = sellerUseCase.updateReel(id, request, bearerToken)
        result.getOrNull()?.let(::updateReelLocally)
        return result
    }

    suspend fun deleteReel(
        id: String,
        bearerToken: String,
    ): NetworkResult<DeleteResponseDto> {
        val result = sellerUseCase.deleteReel(id, bearerToken)
        if (result.getOrNull()?.deleted == true) {
            removeReelLocally(id)
        }
        return result
    }

    suspend fun scheduleBargain(
        productId: String,
        startDate: String,
        endDate: String,
        reservePrice: Double,
        bearerToken: String,
    ): String {
        val repo = bargainRepository ?: return "Bargain service not available"
        val result =
            repo.scheduleBargain(
                productId = productId,
                request = ScheduleBargainRequestDto(startDate = startDate, endDate = endDate, reservePrice = reservePrice),
                bearerToken = bearerToken,
            )
        return when (result) {
            is NetworkResult.Success -> ""

            // Empty string means success
            is NetworkResult.Failure -> result.error.message ?: "Failed to create Bargain Day"
        }
    }

    suspend fun getProductBids(
        productId: String,
        bearerToken: String,
    ): NetworkResult<List<BidDto>> {
        val repo = bargainRepository ?: return NetworkResult.Success(emptyList())
        return repo.getProductBids(productId, bearerToken)
    }

    suspend fun acceptBid(
        productId: String,
        bidId: String,
        bearerToken: String,
    ): NetworkResult<BidDto> {
        val repo =
            bargainRepository ?: return NetworkResult.Failure(
                com.notwhat.shared.core.AppError
                    .Api(503, "Bargain service not available"),
            )
        return repo.acceptBid(productId, bidId, bearerToken)
    }

    suspend fun closeBidPaymentWindow(
        productId: String,
        bidId: String,
        bearerToken: String,
    ): NetworkResult<BidDto> {
        val repo =
            bargainRepository ?: return NetworkResult.Failure(
                com.notwhat.shared.core.AppError
                    .Api(503, "Bargain service not available"),
            )
        return repo.closeBidPaymentWindow(productId, bidId, bearerToken)
    }

    suspend fun reopenBidNegotiation(
        productId: String,
        bidId: String,
        bearerToken: String,
    ): NetworkResult<BidDto> {
        val repo =
            bargainRepository ?: return NetworkResult.Failure(
                com.notwhat.shared.core.AppError
                    .Api(503, "Bargain service not available"),
            )
        return repo.reopenBidNegotiation(productId, bidId, bearerToken)
    }

    suspend fun closeBargain(
        productId: String,
        force: Boolean,
        bearerToken: String,
    ): String {
        val repo = bargainRepository ?: return "Bargain service not available"
        val result = repo.closeBargain(productId = productId, force = force, bearerToken = bearerToken)
        return when (result) {
            is NetworkResult.Success -> ""
            is NetworkResult.Failure -> result.error.message ?: "Failed to close Bargain Day"
        }
    }
}

// Bridge: DemoSellerReel rendering still used by SellerReelListScreen components
internal fun com.notwhat.shared.catalog.ReelDto.toDemoSellerReel(): DemoSellerReel =
    DemoSellerReel(
        id = id,
        title = caption?.takeIf { it.isNotBlank() } ?: category.ifBlank { "Untitled Reel" },
        caption = caption ?: "",
        thumbnailUrl = thumbnailUrl,
        videoUrl = videoUrl,
        duration = "${duration.toInt()}s",
        viewCount = viewCount.toString(),
        isShared = status == "active",
        taggedProducts = taggedProducts.map { it.displayTitle },
    )

internal val ReelDto.displayCreator: String get() = storeId?.storeName ?: "@${id.take(6)}"
internal val ReelDto.displayThumbnail: String get() = thumbnailUrl
internal val ReelDto.displayLabel: String get() =
    when {
        viewCount > 2000 -> "TRENDING"
        likeCount > 500 -> "HOT"
        else -> "NEW"
    }

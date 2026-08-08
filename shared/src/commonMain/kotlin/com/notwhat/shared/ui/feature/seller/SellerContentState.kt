package com.notwhat.shared.ui

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.notwhat.shared.bargain.BargainRepository
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

    suspend fun load(bearerToken: String) {
        isLoading = true
        sellerUseCase.listProducts(bearerToken).getOrNull()?.let { products = it }
        sellerUseCase.listReels(bearerToken).getOrNull()?.let { reels = it }
        sellerUseCase.listOrders(bearerToken).getOrNull()?.let { orders = it }
        isLoading = false
    }

    /** Re-fetches orders after a status change. */
    suspend fun refreshOrders(bearerToken: String) {
        orders = sellerUseCase.listOrders(bearerToken).getOrNull() ?: orders
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
            is NetworkResult.Success -> ""  // Empty string means success
            is NetworkResult.Failure -> result.error.message ?: "Failed to create Bargain Day"
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

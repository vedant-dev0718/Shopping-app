package com.notwhat.shared.domain.bargain

import com.notwhat.shared.bargain.BargainRepository
import com.notwhat.shared.bargain.BargainScheduleDto
import com.notwhat.shared.bargain.BidDto
import com.notwhat.shared.bargain.BidShippingInfoDto
import com.notwhat.shared.bargain.BuyerBidDto
import com.notwhat.shared.bargain.ProductBidSummaryDto
import com.notwhat.shared.bargain.ScheduleBargainRequestDto
import com.notwhat.shared.catalog.DeleteResponseDto
import com.notwhat.shared.core.AppConfig
import com.notwhat.shared.core.NetworkResult

class BargainUseCase(
    private val config: AppConfig,
    private val repository: BargainRepository,
) {
    suspend fun getActiveBargains(): NetworkResult<List<BargainScheduleDto>> = repository.getActiveBargains()

    suspend fun getMyBids(bearerToken: String): NetworkResult<List<BuyerBidDto>> = repository.getMyBids(bearerToken)

    suspend fun getProductBidSummary(
        productId: String,
        bearerToken: String,
    ): NetworkResult<ProductBidSummaryDto> = repository.getProductBidSummary(productId, bearerToken)

    suspend fun placeBid(
        productId: String,
        amount: Double,
        quantity: Int,
        shippingInfo: BidShippingInfoDto,
        bearerToken: String,
    ): NetworkResult<BidDto> = repository.placeBid(productId, amount, quantity, shippingInfo, bearerToken)

    suspend fun withdrawBid(
        bidId: String,
        bearerToken: String,
    ): NetworkResult<DeleteResponseDto> = repository.withdrawBid(bidId, bearerToken)

    suspend fun scheduleBargain(
        productId: String,
        request: ScheduleBargainRequestDto,
        bearerToken: String,
    ): NetworkResult<BargainScheduleDto> = repository.scheduleBargain(productId, request, bearerToken)

    suspend fun closeBargain(
        productId: String,
        bearerToken: String,
    ): NetworkResult<BargainScheduleDto> = repository.closeBargain(productId, bearerToken)
}

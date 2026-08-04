package com.notwhat.shared.domain.bargain

import com.notwhat.shared.bargain.BargainRepository
import com.notwhat.shared.bargain.BargainScheduleDto
import com.notwhat.shared.bargain.BidDto
import com.notwhat.shared.bargain.ScheduleBargainRequestDto
import com.notwhat.shared.catalog.DeleteResponseDto
import com.notwhat.shared.core.AppConfig
import com.notwhat.shared.core.NetworkResult

class BargainUseCase(
    private val config: AppConfig,
    private val repository: BargainRepository,
) {
    suspend fun getActiveBargains(): NetworkResult<List<BargainScheduleDto>> = repository.getActiveBargains()

    suspend fun placeBid(
        productId: String,
        amount: Double,
        bearerToken: String,
    ): NetworkResult<BidDto> = repository.placeBid(productId, amount, bearerToken)

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

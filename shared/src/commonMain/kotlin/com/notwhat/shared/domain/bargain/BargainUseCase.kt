package com.notwhat.shared.domain.bargain

import com.notwhat.shared.bargain.BargainRepository
import com.notwhat.shared.bargain.BargainScheduleDto
import com.notwhat.shared.bargain.BidDto
import com.notwhat.shared.bargain.ScheduleBargainRequestDto
import com.notwhat.shared.bargain.seedActiveBargains
import com.notwhat.shared.catalog.DeleteResponseDto
import com.notwhat.shared.core.AppConfig
import com.notwhat.shared.core.NetworkResult

class BargainUseCase(
    private val config: AppConfig,
    private val repository: BargainRepository,
) {
    suspend fun getActiveBargains(): NetworkResult<List<BargainScheduleDto>> {
        if (config.isMock) return NetworkResult.Success(seedActiveBargains())
        return repository.getActiveBargains()
    }

    suspend fun placeBid(productId: String, amount: Double, bearerToken: String): NetworkResult<BidDto> {
        if (config.isMock) return NetworkResult.Success(BidDto(id = "seed-bid-1", productId = productId, amount = amount, status = "active"))
        return repository.placeBid(productId, amount, bearerToken)
    }

    suspend fun withdrawBid(bidId: String, bearerToken: String): NetworkResult<DeleteResponseDto> {
        if (config.isMock) return NetworkResult.Success(DeleteResponseDto(deleted = true))
        return repository.withdrawBid(bidId, bearerToken)
    }

    suspend fun scheduleBargain(productId: String, request: ScheduleBargainRequestDto, bearerToken: String): NetworkResult<BargainScheduleDto> {
        if (config.isMock) return NetworkResult.Success(seedActiveBargains().first().copy(productId = null))
        return repository.scheduleBargain(productId, request, bearerToken)
    }

    suspend fun closeBargain(productId: String, bearerToken: String): NetworkResult<BargainScheduleDto> {
        if (config.isMock) return NetworkResult.Success(seedActiveBargains().first().copy(status = "closed"))
        return repository.closeBargain(productId, bearerToken)
    }
}

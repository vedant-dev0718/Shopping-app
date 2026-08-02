package com.notwhat.shared.bargain

import com.notwhat.shared.catalog.DeleteResponseDto
import com.notwhat.shared.core.NetworkResult
import com.notwhat.shared.core.runCatchingNetwork
import com.notwhat.shared.network.ApiClient

/** Live-only repository for buyer and seller bargain endpoints. */
class BargainRepository(private val client: ApiClient) {

    suspend fun getActiveBargains(): NetworkResult<List<BargainScheduleDto>> =
        runCatchingNetwork { client.get("bargain/active") }

    suspend fun placeBid(productId: String, amount: Double, bearerToken: String): NetworkResult<BidDto> =
        runCatchingNetwork { client.post("bargain/products/$productId/bids", PlaceBidRequestDto(amount), bearerToken) }

    suspend fun withdrawBid(bidId: String, bearerToken: String): NetworkResult<DeleteResponseDto> =
        runCatchingNetwork { client.delete("bargain/bids/$bidId", bearerToken) }

    // Seller endpoints
    suspend fun scheduleBargain(productId: String, request: ScheduleBargainRequestDto, bearerToken: String): NetworkResult<BargainScheduleDto> =
        runCatchingNetwork { client.post("bargain/products/$productId/schedule", request, bearerToken) }

    suspend fun getProductBids(productId: String, bearerToken: String): NetworkResult<List<BidDto>> =
        runCatchingNetwork { client.get("bargain/products/$productId/bids", bearerToken = bearerToken) }

    suspend fun closeBargain(productId: String, bearerToken: String): NetworkResult<BargainScheduleDto> =
        runCatchingNetwork { client.post("bargain/products/$productId/close", emptyMap<String, String>(), bearerToken) }
}

package com.notwhat.shared.returns

import com.notwhat.shared.core.NetworkResult
import com.notwhat.shared.core.runCatchingNetwork
import com.notwhat.shared.network.ApiClient

/** Buyer return requests at /returns; seller resolution at /seller/returns. */
class ReturnRepository(
    private val client: ApiClient,
) {
    // Buyer
    suspend fun requestReturn(
        request: CreateReturnRequestDto,
        bearerToken: String,
    ): NetworkResult<ReturnRequestResponseDto> = runCatchingNetwork { client.post("returns", request, bearerToken) }

    suspend fun listMyReturns(bearerToken: String): NetworkResult<List<ReturnRequestResponseDto>> =
        runCatchingNetwork { client.get("returns/my", bearerToken = bearerToken) }

    // Seller
    suspend fun listSellerReturns(bearerToken: String): NetworkResult<List<ReturnRequestResponseDto>> =
        runCatchingNetwork { client.get("seller/returns", bearerToken = bearerToken) }

    suspend fun getSellerReturn(
        returnId: String,
        bearerToken: String,
    ): NetworkResult<ReturnRequestResponseDto> = runCatchingNetwork { client.get("seller/returns/$returnId", bearerToken = bearerToken) }

    suspend fun approveReturn(
        returnId: String,
        bearerToken: String,
    ): NetworkResult<ReturnRequestResponseDto> =
        runCatchingNetwork { client.patch("seller/returns/$returnId/approve", emptyMap<String, String>(), bearerToken) }

    suspend fun rejectReturn(
        returnId: String,
        request: RejectReturnRequestDto,
        bearerToken: String,
    ): NetworkResult<ReturnRequestResponseDto> =
        runCatchingNetwork { client.patch("seller/returns/$returnId/reject", request, bearerToken) }

    suspend fun markReturnReceived(
        returnId: String,
        bearerToken: String,
    ): NetworkResult<ReturnRequestResponseDto> =
        runCatchingNetwork { client.patch("seller/returns/$returnId/mark-received", emptyMap<String, String>(), bearerToken) }
}

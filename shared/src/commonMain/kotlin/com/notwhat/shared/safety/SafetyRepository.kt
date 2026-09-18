package com.notwhat.shared.safety

import com.notwhat.shared.core.NetworkResult
import com.notwhat.shared.core.runCatchingNetwork
import com.notwhat.shared.network.ApiClient

/** Content reporting and user blocking — /safety. */
class SafetyRepository(
    private val client: ApiClient,
) {
    suspend fun createReport(
        request: CreateReportRequestDto,
        bearerToken: String,
    ): NetworkResult<ReportResponseDto> = runCatchingNetwork { client.post("safety/reports", request, bearerToken) }

    suspend fun listBlockedUsers(bearerToken: String): NetworkResult<List<BlockedUserDto>> =
        runCatchingNetwork { client.get("safety/blocks", bearerToken = bearerToken) }

    suspend fun blockUser(
        userId: String,
        bearerToken: String,
    ): NetworkResult<BlockedUserDto> = runCatchingNetwork { client.post("safety/blocks/$userId", emptyMap<String, String>(), bearerToken) }

    suspend fun unblockUser(
        userId: String,
        bearerToken: String,
    ): NetworkResult<BlockedUserDto> = runCatchingNetwork { client.delete("safety/blocks/$userId", bearerToken = bearerToken) }
}

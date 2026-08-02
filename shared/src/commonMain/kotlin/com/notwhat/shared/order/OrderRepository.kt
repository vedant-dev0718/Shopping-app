package com.notwhat.shared.order

import com.notwhat.shared.core.NetworkResult
import com.notwhat.shared.core.runCatchingNetwork
import com.notwhat.shared.network.ApiClient

/** Live-only repository for buyer order endpoints. */
class OrderRepository(private val client: ApiClient) {

    suspend fun listOrders(bearerToken: String): NetworkResult<List<OrderDto>> =
        runCatchingNetwork { client.get("orders", bearerToken = bearerToken) }

    suspend fun getOrder(id: String, bearerToken: String): NetworkResult<OrderDto> =
        runCatchingNetwork { client.get("orders/$id", bearerToken = bearerToken) }

    suspend fun cancelOrder(id: String, request: CancelOrderRequestDto, bearerToken: String): NetworkResult<OrderDto> =
        runCatchingNetwork { client.post("orders/$id/cancel", request, bearerToken) }

    suspend fun requestReturn(id: String, request: ReturnRequestDto, bearerToken: String): NetworkResult<OrderDto> =
        runCatchingNetwork { client.post("orders/$id/returns", request, bearerToken) }

    suspend fun getRefundStatus(id: String, bearerToken: String): NetworkResult<RefundStatusDto> =
        runCatchingNetwork { client.get("orders/$id/refund-status", bearerToken = bearerToken) }

    suspend fun getReturnStatus(id: String, bearerToken: String): NetworkResult<ReturnStatusDto> =
        runCatchingNetwork { client.get("orders/$id/return-status", bearerToken = bearerToken) }
}

package com.notwhat.shared.seller

import com.notwhat.shared.core.NetworkResult
import com.notwhat.shared.core.runCatchingNetwork
import com.notwhat.shared.network.ApiClient
import com.notwhat.shared.order.OrderDto

/** Live-only repository for seller order management endpoints. */
class SellerOrderRepository(
    private val client: ApiClient,
) {
    suspend fun listOrders(
        bearerToken: String,
        status: String? = null,
    ): NetworkResult<List<OrderDto>> =
        runCatchingNetwork {
            client.get("seller/orders", bearerToken = bearerToken, params = mapOf("status" to status))
        }

    suspend fun getOrder(
        orderId: String,
        bearerToken: String,
    ): NetworkResult<OrderDto> = runCatchingNetwork { client.get("seller/orders/$orderId", bearerToken = bearerToken) }

    suspend fun acceptOrder(
        orderId: String,
        bearerToken: String,
    ): NetworkResult<OrderDto> =
        runCatchingNetwork { client.post("seller/orders/$orderId/accept", emptyMap<String, String>(), bearerToken) }

    suspend fun rejectOrder(
        orderId: String,
        reason: String,
        messageToBuyer: String,
        bearerToken: String,
    ): NetworkResult<OrderDto> =
        runCatchingNetwork {
            client.post("seller/orders/$orderId/reject", RejectOrderRequestDto(reason, messageToBuyer), bearerToken)
        }

    suspend fun shipOrder(
        orderId: String,
        request: ShipOrderRequestDto,
        bearerToken: String,
    ): NetworkResult<OrderDto> = runCatchingNetwork { client.patch("seller/orders/$orderId/ship", request, bearerToken) }

    suspend fun markDelivered(
        orderId: String,
        bearerToken: String,
    ): NetworkResult<OrderDto> =
        runCatchingNetwork { client.post("seller/orders/$orderId/delivered", emptyMap<String, String>(), bearerToken) }
}

package com.notwhat.shared.domain.order

import com.notwhat.shared.core.AppConfig
import com.notwhat.shared.core.NetworkResult
import com.notwhat.shared.order.CancelOrderRequestDto
import com.notwhat.shared.order.OrderDto
import com.notwhat.shared.order.OrderRepository
import com.notwhat.shared.order.RefundStatusDto
import com.notwhat.shared.order.ReturnRequestDto
import com.notwhat.shared.order.ReturnStatusDto

class OrderUseCase(
    private val config: AppConfig,
    private val repository: OrderRepository,
) {
    suspend fun listOrders(bearerToken: String): NetworkResult<List<OrderDto>> = repository.listOrders(bearerToken)

    suspend fun getOrder(
        id: String,
        bearerToken: String,
    ): NetworkResult<OrderDto> = repository.getOrder(id, bearerToken)

    suspend fun cancelOrder(
        id: String,
        reason: String,
        bearerToken: String,
    ): NetworkResult<OrderDto> = repository.cancelOrder(id, CancelOrderRequestDto(reason), bearerToken)

    suspend fun requestReturn(
        id: String,
        request: ReturnRequestDto,
        bearerToken: String,
    ): NetworkResult<OrderDto> = repository.requestReturn(id, request, bearerToken)

    suspend fun getRefundStatus(
        id: String,
        bearerToken: String,
    ): NetworkResult<RefundStatusDto> = repository.getRefundStatus(id, bearerToken)

    suspend fun getReturnStatus(
        id: String,
        bearerToken: String,
    ): NetworkResult<ReturnStatusDto> = repository.getReturnStatus(id, bearerToken)
}

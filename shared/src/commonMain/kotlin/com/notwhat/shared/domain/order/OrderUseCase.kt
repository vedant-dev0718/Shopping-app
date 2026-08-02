package com.notwhat.shared.domain.order

import com.notwhat.shared.core.AppConfig
import com.notwhat.shared.core.NetworkResult
import com.notwhat.shared.order.CancelOrderRequestDto
import com.notwhat.shared.order.OrderDto
import com.notwhat.shared.order.OrderRepository
import com.notwhat.shared.order.RefundStatusDto
import com.notwhat.shared.order.ReturnRequestDto
import com.notwhat.shared.order.ReturnStatusDto
import com.notwhat.shared.order.seedOrders

class OrderUseCase(
    private val config: AppConfig,
    private val repository: OrderRepository,
) {
    suspend fun listOrders(bearerToken: String): NetworkResult<List<OrderDto>> {
        if (config.isMock) return NetworkResult.Success(seedOrders())
        return repository.listOrders(bearerToken)
    }

    suspend fun getOrder(id: String, bearerToken: String): NetworkResult<OrderDto> {
        if (config.isMock) return NetworkResult.Success(seedOrders().firstOrNull { it.id == id } ?: seedOrders().first())
        return repository.getOrder(id, bearerToken)
    }

    suspend fun cancelOrder(id: String, reason: String, bearerToken: String): NetworkResult<OrderDto> {
        if (config.isMock) return NetworkResult.Success(seedOrders().first().copy(status = "cancelled", cancelReason = reason))
        return repository.cancelOrder(id, CancelOrderRequestDto(reason), bearerToken)
    }

    suspend fun requestReturn(id: String, request: ReturnRequestDto, bearerToken: String): NetworkResult<OrderDto> {
        if (config.isMock) return NetworkResult.Success(seedOrders().first().copy(status = "return_requested"))
        return repository.requestReturn(id, request, bearerToken)
    }

    suspend fun getRefundStatus(id: String, bearerToken: String): NetworkResult<RefundStatusDto> {
        if (config.isMock) return NetworkResult.Success(RefundStatusDto(refundStatus = "pending"))
        return repository.getRefundStatus(id, bearerToken)
    }

    suspend fun getReturnStatus(id: String, bearerToken: String): NetworkResult<ReturnStatusDto> {
        if (config.isMock) return NetworkResult.Success(ReturnStatusDto(returnStatus = "pending"))
        return repository.getReturnStatus(id, bearerToken)
    }
}

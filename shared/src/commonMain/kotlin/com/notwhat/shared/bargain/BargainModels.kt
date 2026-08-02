package com.notwhat.shared.bargain

import com.notwhat.shared.catalog.ProductDto
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonNames

@OptIn(ExperimentalSerializationApi::class)
@Serializable
data class BargainScheduleDto(
    @JsonNames("id", "_id") val id: String = "",
    val productId: ProductDto? = null,
    val sellerId: String = "",
    val startDate: String = "",
    val endDate: String = "",
    val reservePrice: Double = 0.0,
    val status: String = "active",   // active | closed | cancelled
    val winningBidId: String? = null,
)

@OptIn(ExperimentalSerializationApi::class)
@Serializable
data class BidDto(
    @JsonNames("id", "_id") val id: String = "",
    val productId: String = "",
    val bidderId: String = "",
    val amount: Double = 0.0,
    val status: String = "active",
    val createdAt: String? = null,
)

@Serializable
data class PlaceBidRequestDto(val amount: Double)

@Serializable
data class ScheduleBargainRequestDto(
    val startDate: String,
    val endDate: String,
    val reservePrice: Double = 0.0,
)

fun seedActiveBargains(): List<BargainScheduleDto> {
    val products = com.notwhat.shared.catalog.seedProducts()
    return products.take(2).mapIndexed { idx, p ->
        BargainScheduleDto(
            id = "seed-bargain-$idx",
            productId = p,
            startDate = "2026-08-01T10:00:00.000Z",
            endDate = "2026-08-03T10:00:00.000Z",
            reservePrice = p.price * 0.7,
            status = "active",
        )
    }
}

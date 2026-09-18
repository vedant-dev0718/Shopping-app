package com.notwhat.shared.ui

import com.notwhat.shared.checkout.CheckoutPaymentMethod

// ---------------------------------------------------------------------------
// Types retained after Phase 8 cleanup.
// Removed: DemoStore, DemoAddress, DemoSellerProduct, DemoSellerOrderQueueItem,
//          DemoSellerSnapshot — all replaced by DTO types in Phases 5–7.
// ---------------------------------------------------------------------------

internal data class DemoCategory(
    val name: String,
    val label: String,
    val imageUrl: String,
)

// Bridge type — used in CheckoutDraft until a real CartLineItemDto is wired through checkout
internal data class DemoProduct(
    val name: String,
    val price: String,
    val originalPrice: String? = null,
    val store: String,
    val category: String,
    val imageUrl: String,
)

// Used in BargainFixtures.forReel(DemoReel) and DemoReel.toProductDtoStub() bridge
internal data class DemoReel(
    val creator: String,
    val price: String,
    val label: String,
    val imageUrl: String,
)

internal data class DemoCartItem(
    val product: DemoProduct,
    val size: String,
    val quantity: Int,
)

internal data class DemoSavedPayment(
    val method: CheckoutPaymentMethod = CheckoutPaymentMethod.UNKNOWN,
    val label: String,
    val maskedNumber: String,
    val holderName: String,
    val isDefault: Boolean,
)

internal data class CheckoutDraft(
    val items: List<DemoCartItem>,
    val selectedPayment: DemoSavedPayment,
    val subtotal: String,
    val shipping: String,
    val total: String,
    val shippingAddress: String,
    val selectedAddressId: String? = null,
)

internal data class CheckoutOrderSummary(
    val orderId: String,
    val orderNumber: String = "",
    val paymentStatus: String = "pending",
    val orderStatus: String = "placed",
    val items: List<DemoCartItem>,
    val payment: DemoSavedPayment,
    val subtotal: String,
    val shipping: String,
    val total: String,
    val shippingAddress: String,
    val estimatedDelivery: String,
    val trackingSteps: List<OrderTrackingStep>,
)

internal data class OrderTrackingStep(
    val title: String,
    val detail: String,
    val timestamp: String,
    val isComplete: Boolean,
)

// Display structs for profile stats and seller KPIs — computed from live data, not pulled from vals
internal data class DemoProfileStats(
    val orders: String,
    val saved: String,
    val reviews: String,
    val following: String,
)

internal data class DemoSellerKpi(
    val label: String,
    val value: String,
    val trend: String,
)

internal data class DemoSellerOrderPulse(
    val status: String,
    val count: Int,
)

internal data class DemoSellerInsightItem(
    val title: String,
    val detail: String,
    val action: String,
)

internal data class DemoSellerDrillDownCard(
    val title: String,
    val metric: String,
    val detail: String,
)

internal data class DemoSellerReturnRequest(
    val orderId: String,
    val productName: String,
    val size: String,
    val color: String,
    val status: String,
    val reason: String,
    val buyerNote: String,
    val suggestedRefund: String,
    val buyerPhotoCount: Int,
)

internal data class DemoSellerReel(
    val id: String,
    val title: String,
    val caption: String,
    val thumbnailUrl: String,
    val videoUrl: String = "",
    val duration: String,
    val viewCount: String,
    val isShared: Boolean,
    val taggedProducts: List<String> = emptyList(),
)

internal data class DemoReelDraft(
    val title: String,
    val caption: String,
    val duration: String,
    val coverImageUrl: String,
    val allowBargaining: Boolean,
    val taggedProducts: List<String>,
)

internal object PreviewContent {
    private object DemoImages {
        const val avatarA = "https://images.unsplash.com/photo-1529068755536-a5ade0dcb4e8?w=400&fit=crop"
        const val reelA = "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900&fit=crop"
        const val reelB = "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=900&fit=crop"
        const val productA = "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=900&fit=crop"
        const val productB = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&fit=crop"
        const val productC = "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=900&fit=crop"
        const val categoryA = "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600&fit=crop"
        const val categoryB = "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=600&fit=crop"
    }

    // Fallback category chips shown before DiscoveryRepository loads
    val categories =
        listOf(
            DemoCategory("Kurtas", "kurtas", DemoImages.categoryA),
            DemoCategory("Sarees", "sarees", DemoImages.categoryB),
            DemoCategory("Accessories", "accessories", DemoImages.productC),
            DemoCategory("Jewellery", "jewellery", DemoImages.avatarA),
        )

    // Payment methods — kept until PaymentRepository is added
    val savedPayments =
        listOf(
            DemoSavedPayment(
                method = CheckoutPaymentMethod.CARD,
                label = "Visa",
                maskedNumber = "**** 4821",
                holderName = "Vedant T.",
                isDefault = true,
            ),
            DemoSavedPayment(
                method = CheckoutPaymentMethod.CARD,
                label = "RuPay",
                maskedNumber = "**** 9034",
                holderName = "Vedant T.",
                isDefault = false,
            ),
        )

    // Fallback return requests shown before SellerOrderRepository loads
    val sellerReturnRequests =
        listOf(
            DemoSellerReturnRequest(
                orderId = "NW-88921",
                productName = "Block Print Kurta",
                size = "L",
                color = "Indigo",
                status = "Requested",
                reason = "Size too small",
                buyerNote = "The fit is tighter than described.",
                suggestedRefund = "₹1,899.00",
                buyerPhotoCount = 2,
            ),
            DemoSellerReturnRequest(
                orderId = "NW-90122",
                productName = "Banarasi Silk Saree",
                size = "-",
                color = "Gold",
                status = "Requested",
                reason = "Wrong item delivered",
                buyerNote = "Received a different colour than ordered.",
                suggestedRefund = "₹6,499.00",
                buyerPhotoCount = 1,
            ),
        )

    // Fallback seller reels shown before SellerUseCase.listReels() loads
    val sellerReels =
        listOf(
            DemoSellerReel(
                id = "seed-reel-1",
                title = "Block Print Drop",
                caption = "New block-print collection just dropped",
                thumbnailUrl = "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=400",
                duration = "0:18",
                viewCount = "1.2k",
                isShared = true,
            ),
            DemoSellerReel(
                id = "seed-reel-2",
                title = "Silk Saree Styling",
                caption = "Draping a Banarasi silk step by step",
                thumbnailUrl = "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400",
                duration = "0:22",
                viewCount = "3.9k",
                isShared = true,
            ),
        )

    // Kept for BidSheetHostUiTest
    val reels =
        listOf(
            DemoReel("UrbanKing", "₹2,499", "LIVE", DemoImages.reelA),
            DemoReel("SoleSearch", "₹8,999", "BARGAIN", DemoImages.reelB),
        )
    val products =
        listOf(
            DemoProduct("Block Print Kurta", "₹1,899", null, "Jaipur Looms", "Kurtas", DemoImages.productA),
            DemoProduct("Banarasi Silk Saree", "₹6,499", null, "Varanasi Weavers", "Sarees", DemoImages.productB),
            DemoProduct("Kalamkari Tote", "₹799", null, "Andhra Crafts", "Accessories", DemoImages.productC),
        )
}

package com.notwhat.shared.di

import com.notwhat.shared.address.AddressRepository
import com.notwhat.shared.analytics.SellerAnalyticsRepository
import com.notwhat.shared.auth.AuthRepository
import com.notwhat.shared.auth.SharedAuthPersistence
import com.notwhat.shared.bargain.BargainRepository
import com.notwhat.shared.cart.CartRepository
import com.notwhat.shared.catalog.ProductRepository
import com.notwhat.shared.catalog.ReelRepository
import com.notwhat.shared.catalog.StoreRepository
import com.notwhat.shared.checkout.CheckoutRepository
import com.notwhat.shared.comments.CommentRepository
import com.notwhat.shared.config.BackendFlowMode
import com.notwhat.shared.contact.ContactRepository
import com.notwhat.shared.core.AppConfig
import com.notwhat.shared.discovery.DiscoveryRepository
import com.notwhat.shared.domain.auth.AuthUseCase
import com.notwhat.shared.domain.bargain.BargainUseCase
import com.notwhat.shared.domain.cart.CartUseCase
import com.notwhat.shared.domain.catalog.CatalogUseCase
import com.notwhat.shared.domain.order.OrderUseCase
import com.notwhat.shared.domain.search.SearchUseCase
import com.notwhat.shared.domain.seller.SellerUseCase
import com.notwhat.shared.finance.FinanceRepository
import com.notwhat.shared.likes.LikeRepository
import com.notwhat.shared.network.ApiClient
import com.notwhat.shared.network.defaultApiBaseUrl
import com.notwhat.shared.order.OrderRepository
import com.notwhat.shared.recommendations.RecommendationRepository
import com.notwhat.shared.returns.ReturnRepository
import com.notwhat.shared.safety.SafetyRepository
import com.notwhat.shared.search.SearchRepository
import com.notwhat.shared.seller.SellerOrderRepository
import com.notwhat.shared.uploads.UploadRepository

/**
 * Manual dependency-injection graph for the shared module.
 *
 * Create one [ServiceLocator] per application lifecycle and pass it to the
 * root composable / host view controller.  No static singletons — callers
 * own the lifetime.
 *
 * In tests, construct a [ServiceLocator] with a custom [AppConfig] (e.g.
 * `AppConfig(BackendFlowMode.MOCK)`) so that the real network is never hit.
 */
class ServiceLocator(
    val config: AppConfig = AppConfig(initialBackendMode = BackendFlowMode.MOCK),
) {
    // Shared HTTP client — single instance for all feature repositories
    private val apiClient: ApiClient by lazy { ApiClient(baseUrl = config.apiBaseUrl) }

    // Auth (Phase 2 — uses its own HttpClient to preserve existing behaviour)
    val authRepository: AuthRepository by lazy { AuthRepository(baseUrl = config.apiBaseUrl) }
    val authUseCase: AuthUseCase by lazy { AuthUseCase(config = config, repository = authRepository) }
    val authPersistence: SharedAuthPersistence by lazy { SharedAuthPersistence() }

    // Catalog (Phase 3)
    val productRepository: ProductRepository by lazy { ProductRepository(apiClient) }
    val reelRepository: ReelRepository by lazy { ReelRepository(apiClient) }
    val storeRepository: StoreRepository by lazy { StoreRepository(apiClient) }
    val catalogUseCase: CatalogUseCase by lazy {
        CatalogUseCase(config, productRepository, reelRepository, storeRepository)
    }

    // Discovery (Phase 3)
    val discoveryRepository: DiscoveryRepository by lazy { DiscoveryRepository(apiClient) }

    // Cart (Phase 3)
    val cartRepository: CartRepository by lazy { CartRepository(apiClient) }
    val cartUseCase: CartUseCase by lazy { CartUseCase(config, cartRepository) }

    // Orders (Phase 3)
    val orderRepository: OrderRepository by lazy { OrderRepository(apiClient) }
    val orderUseCase: OrderUseCase by lazy { OrderUseCase(config, orderRepository) }

    // Checkout (Phase 3)
    val checkoutRepository: CheckoutRepository by lazy { CheckoutRepository(apiClient) }

    // Addresses (Phase 3)
    val addressRepository: AddressRepository by lazy { AddressRepository(apiClient) }

    // Search (Phase 4)
    val searchRepository: SearchRepository by lazy { SearchRepository(apiClient) }
    val searchUseCase: SearchUseCase by lazy { SearchUseCase(config, searchRepository) }

    // Seller (Phase 6)
    val sellerOrderRepository: SellerOrderRepository by lazy { SellerOrderRepository(apiClient) }
    val sellerUseCase: SellerUseCase by lazy { SellerUseCase(config, catalogUseCase, sellerOrderRepository) }

    // Bargains (Phase 7)
    val bargainRepository: BargainRepository by lazy { BargainRepository(apiClient) }
    val bargainUseCase: BargainUseCase by lazy { BargainUseCase(config, bargainRepository) }

    // Phase 8 — engagement, returns, contact, safety, seller analytics
    val likeRepository: LikeRepository by lazy { LikeRepository(apiClient) }
    val returnRepository: ReturnRepository by lazy { ReturnRepository(apiClient) }
    val contactRepository: ContactRepository by lazy { ContactRepository(apiClient) }
    val safetyRepository: SafetyRepository by lazy { SafetyRepository(apiClient) }
    val sellerAnalyticsRepository: SellerAnalyticsRepository by lazy { SellerAnalyticsRepository(apiClient) }

    // Phase 9 — recommendations, comments, finance, uploads
    val recommendationRepository: RecommendationRepository by lazy { RecommendationRepository(apiClient) }
    val commentRepository: CommentRepository by lazy { CommentRepository(apiClient) }
    val financeRepository: FinanceRepository by lazy { FinanceRepository(apiClient) }
    val uploadRepository: UploadRepository by lazy { UploadRepository(apiClient) }
}

package com.notwhat.shared.session

import kotlinx.serialization.Serializable

@Serializable
enum class UserRole(
    val title: String,
    val subtitle: String,
    val badge: String,
) {
    Buyer(
        title = "Buyer",
        subtitle = "Discover regional fashion, reels, and bargain drops.",
        badge = "Browse",
    ),
    Seller(
        title = "Seller",
        subtitle = "Preview your storefront, uploads, and demand signals.",
        badge = "Sell",
    ),
    Admin(
        title = "Admin",
        subtitle = "Review marketplace operations and seller readiness.",
        badge = "Ops",
    ),
}

@Serializable
data class UserSession(
    val role: UserRole,
    val name: String,
    val headline: String,
    val email: String = "",
    val authToken: String? = null,
    val requiresSellerProfileSetup: Boolean = false,
    /** True when this session was produced by the seed/mock backend, not a real auth call. */
    val isSeeded: Boolean = true,
)

/** Produces a seeded [UserSession] for the given role (used in mock mode and tests). */
fun seedSessionForRole(role: UserRole): UserSession = when (role) {
    UserRole.Buyer -> UserSession(
        role = role,
        name = "Aanya",
        headline = "Saved picks from Jaipur, Benaras, and Lucknow.",
        email = "buyer@example.com",
        authToken = "mock-token-buyer",
    )
    UserRole.Seller -> UserSession(
        role = role,
        name = "Jaipur Looms",
        headline = "7 reels live, 12 products active, 4 bargain-day bids today.",
        email = "seller@example.com",
        authToken = "mock-token-seller",
    )
    UserRole.Admin -> UserSession(
        role = role,
        name = "Operations Desk",
        headline = "Marketplace health, search quality, and seller readiness snapshot.",
        email = "admin@example.com",
        authToken = "mock-token-admin",
    )
}

// ---------------------------------------------------------------------------
// Backward-compat type aliases — remove once all call sites are migrated.
// ---------------------------------------------------------------------------
@Deprecated("Use UserRole", ReplaceWith("UserRole"))
typealias MockUserRole = UserRole

@Deprecated("Use UserSession", ReplaceWith("UserSession"))
typealias MockUserSession = UserSession

@Deprecated("Use seedSessionForRole", ReplaceWith("seedSessionForRole(role)"))
fun mockSessionForRole(role: UserRole): UserSession = seedSessionForRole(role)
package com.notwhat.shared.search

import kotlinx.serialization.Serializable

@Serializable
data class SearchFilters(
    val region: String? = null,
    val category: String? = null,
    val city: String? = null,
    val state: String? = null,
    val sellerStore: String? = null,
    val minPrice: Double? = null,
    val maxPrice: Double? = null,
) {
    fun hasActiveFilters(): Boolean {
        return !region.clean().isNullOrEmpty() ||
            !category.clean().isNullOrEmpty() ||
            !city.clean().isNullOrEmpty() ||
            !state.clean().isNullOrEmpty() ||
            !sellerStore.clean().isNullOrEmpty() ||
            minPrice != null ||
            maxPrice != null
    }

    fun remove(kind: SearchFilterKind): SearchFilters {
        return when (kind) {
            SearchFilterKind.REGION -> copy(region = null)
            SearchFilterKind.CATEGORY -> copy(category = null)
            SearchFilterKind.CITY -> copy(city = null)
            SearchFilterKind.STATE -> copy(state = null)
            SearchFilterKind.SELLER_STORE -> copy(sellerStore = null)
            SearchFilterKind.MIN_PRICE -> copy(minPrice = null)
            SearchFilterKind.MAX_PRICE -> copy(maxPrice = null)
        }
    }

    fun toQueryParameters(
        searchTerm: String? = null,
        limit: Int? = null,
        includePrice: Boolean = true,
        includeSellerStore: Boolean = true,
    ): Map<String, String> {
        val params = linkedMapOf<String, String>()

        searchTerm.clean()?.let { params["q"] = it }
        region.clean()?.let { params["region"] = it }
        category.clean()?.let { params["category"] = it }
        city.clean()?.let { params["city"] = it }
        state.clean()?.let { params["state"] = it }

        if (includeSellerStore) {
            sellerStore.clean()?.let { params["sellerStore"] = it }
        }

        if (includePrice) {
            minPrice?.let { params["minPrice"] = formatPrice(it) }
            maxPrice?.let { params["maxPrice"] = formatPrice(it) }
        }

        limit?.let { params["limit"] = it.toString() }

        return params
    }

    private fun formatPrice(value: Double): String {
        val intValue = value.toInt()
        return if (value == intValue.toDouble()) {
            intValue.toString()
        } else {
            value.toString()
        }
    }
}

private fun String?.clean(): String? {
    val trimmed = this?.trim()
    return if (trimmed.isNullOrEmpty()) null else trimmed
}

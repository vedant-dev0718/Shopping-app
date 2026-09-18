package com.notwhat.shared.search

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class SearchFiltersTest {
    @Test
    fun hasActiveFilters_returnsFalse_whenAllUnset() {
        val filters = SearchFilters()

        assertFalse(filters.hasActiveFilters())
    }

    @Test
    fun hasActiveFilters_returnsTrue_whenAnyFilterExists() {
        val filters = SearchFilters(region = "  Rajasthan  ")

        assertTrue(filters.hasActiveFilters())
    }

    @Test
    fun remove_clearsOnlyRequestedFilter() {
        val filters = SearchFilters(region = "Rajasthan", city = "Jaipur")

        val removed = filters.remove(SearchFilterKind.REGION)

        assertNull(removed.region)
        assertEquals("Jaipur", removed.city)
    }

    @Test
    fun toQueryParameters_matchesApiContract() {
        val filters = SearchFilters(
            region = " Rajasthan ",
            category = "Ethnic",
            minPrice = 999.0,
            maxPrice = 1499.5,
            sellerStore = "Lehenga House",
        )

        val params = filters.toQueryParameters(searchTerm = "  mirror work ", limit = 20)

        assertEquals("mirror work", params["q"])
        assertEquals("Rajasthan", params["region"])
        assertEquals("Ethnic", params["category"])
        assertEquals("999", params["minPrice"])
        assertEquals("1499.5", params["maxPrice"])
        assertEquals("Lehenga House", params["sellerStore"])
        assertEquals("20", params["limit"])
    }
}

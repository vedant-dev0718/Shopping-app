package com.notwhat.shared.domain.search

import com.notwhat.shared.catalog.seedProducts
import com.notwhat.shared.catalog.seedReels
import com.notwhat.shared.catalog.seedStores
import com.notwhat.shared.core.AppConfig
import com.notwhat.shared.search.SearchRepository
import com.notwhat.shared.search.SearchResults

class SearchUseCase(
    private val config: AppConfig,
    private val repository: SearchRepository,
) {
    suspend fun search(query: String, category: String? = null): SearchResults {
        if (config.isMock) return mockSearch(query, category)

        val products = repository.searchProducts(query, category).getOrNull() ?: emptyList()
        val stores = repository.searchStores(query).getOrNull() ?: emptyList()
        val reels = repository.searchReels(query).getOrNull() ?: emptyList()
        return SearchResults(query = query, products = products, stores = stores, reels = reels)
    }

    private fun mockSearch(query: String, category: String?): SearchResults {
        val q = query.lowercase()
        val products = seedProducts().filter { p ->
            val catMatch = category == null || p.category.lowercase() == category.lowercase()
            catMatch && (q.isBlank() || p.title.lowercase().contains(q) || p.category.lowercase().contains(q))
        }
        val stores = seedStores().filter { s ->
            q.isBlank() || s.storeName.lowercase().contains(q) || (s.region?.lowercase()?.contains(q) == true)
        }
        val reels = seedReels().filter { r ->
            q.isBlank() || r.caption?.lowercase()?.contains(q) == true || r.category.lowercase().contains(q)
        }
        return SearchResults(query = query, products = products, stores = stores, reels = reels)
    }
}

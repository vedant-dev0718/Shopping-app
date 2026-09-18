package com.notwhat.shared.domain.search

import com.notwhat.shared.core.AppConfig
import com.notwhat.shared.search.SearchRepository
import com.notwhat.shared.search.SearchResults

class SearchUseCase(
    private val config: AppConfig,
    private val repository: SearchRepository,
) {
    suspend fun search(
        query: String,
        category: String? = null,
    ): SearchResults {
        val products = repository.searchProducts(query, category).getOrNull() ?: emptyList()
        val stores = repository.searchStores(query).getOrNull() ?: emptyList()
        val reels = repository.searchReels(query).getOrNull() ?: emptyList()
        return SearchResults(query = query, products = products, stores = stores, reels = reels)
    }
}

package com.notwhat.shared.search

import com.notwhat.shared.config.BackendFlowMode
import com.notwhat.shared.core.AppConfig
import com.notwhat.shared.domain.search.SearchUseCase
import com.notwhat.shared.network.ApiClient
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class SearchUseCaseTest {
    private fun useCase() = SearchUseCase(
        config = AppConfig(initialBackendMode = BackendFlowMode.MOCK),
        repository = SearchRepository(ApiClient("http://localhost:5001/api", ApiClient.buildDefaultClient())),
    )

    @Test
    fun search_emptyQuery_returnsSeedData() {
        val results = kotlinx.coroutines.runBlocking { useCase().search("") }
        assertEquals("", results.query)
        assertTrue(results.products.isNotEmpty())
        assertTrue(results.stores.isNotEmpty())
    }

    @Test
    fun search_matchingQuery_filtersProducts() {
        val results = kotlinx.coroutines.runBlocking { useCase().search("kurta") }
        assertTrue(results.products.all { it.category.lowercase().contains("kurta") || it.title.lowercase().contains("kurta") })
    }

    @Test
    fun search_withCategory_restrictsByCategory() {
        val results = kotlinx.coroutines.runBlocking { useCase().search("", "Sarees") }
        assertTrue(results.products.all { it.category.equals("Sarees", ignoreCase = true) })
    }

    @Test
    fun search_nonMatchingQuery_returnsEmptyProducts() {
        val results = kotlinx.coroutines.runBlocking { useCase().search("zzznomatch1234") }
        assertTrue(results.products.isEmpty())
        assertTrue(results.stores.isEmpty())
    }

    @Test
    fun search_storeQuery_matchesStoreName() {
        val results = kotlinx.coroutines.runBlocking { useCase().search("jaipur") }
        assertTrue(results.stores.any { it.storeName.lowercase().contains("jaipur") })
    }
}

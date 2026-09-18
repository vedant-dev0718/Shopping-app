package com.notwhat.shared.search

import kotlin.test.Test
import kotlin.test.assertEquals

class RecentSearchesUseCaseTest {
    @Test
    fun remember_deduplicates_case_insensitive_and_pushes_latest_to_front() {
        val useCase = RecentSearchesUseCase(maxEntries = 4)

        val updated = useCase.remember(
            existing = listOf("Lehenga", "Saree", "Kurti"),
            term = "  saree ",
        )

        assertEquals(listOf("saree", "Lehenga", "Kurti"), updated)
    }

    @Test
    fun remember_enforces_max_entries() {
        val useCase = RecentSearchesUseCase(maxEntries = 3)

        val updated = useCase.remember(
            existing = listOf("A", "B", "C"),
            term = "D",
        )

        assertEquals(listOf("D", "A", "B"), updated)
    }
}

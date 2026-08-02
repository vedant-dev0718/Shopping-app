package com.notwhat.shared.search

class RecentSearchesUseCase(
    private val maxEntries: Int = 8,
) {
    fun remember(existing: List<String>, term: String): List<String> {
        val cleaned = term.trim()
        if (cleaned.isEmpty()) {
            return existing
        }

        val deduped = existing.filterNot { it.equals(cleaned, ignoreCase = true) }
        return (listOf(cleaned) + deduped).take(maxEntries)
    }

    fun clear(): List<String> = emptyList()
}

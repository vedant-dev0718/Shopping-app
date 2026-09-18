package com.notwhat.shared.search

import com.notwhat.shared.catalog.ProductDto
import com.notwhat.shared.catalog.ReelDto
import com.notwhat.shared.catalog.StoreDto

data class SearchResults(
    val query: String,
    val products: List<ProductDto> = emptyList(),
    val stores: List<StoreDto> = emptyList(),
    val reels: List<ReelDto> = emptyList(),
)

package com.notwhat.shared.ui

import com.notwhat.shared.auth.AuthPersistenceStore
import com.notwhat.shared.config.BackendFlowMode
import com.notwhat.shared.core.AppConfig
import com.notwhat.shared.di.ServiceLocator
import com.notwhat.shared.search.SearchFilterKind
import com.notwhat.shared.session.UserRole
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class NotWhatAppStateTest {
    private fun freshState(): NotWhatAppState {
        AuthPersistenceStore.clearAll()
        val locator = ServiceLocator(AppConfig(BackendFlowMode.MOCK))
        locator.authPersistence.saveBackendMode(BackendFlowMode.MOCK)
        return NotWhatAppState(locator)
    }

    @Test
    fun selectTab_updatesActiveTab() {
        val state = freshState()

        state.selectTab(NotWhatTab.Search)

        assertEquals(NotWhatTab.Search, state.activeTab)
    }

    @Test
    fun submitSearch_tracksRecentSearches() {
        val state = freshState()

        state.updateQuery(" Kurti ")
        state.submitSearch()
        state.updateQuery("kurti")
        state.submitSearch()

        assertEquals(listOf("kurti"), state.recentSearches)
    }

    @Test
    fun removingCategoryFilter_clearsSelectedCategory() {
        val state = freshState()

        state.selectCategory("Apparel")
        state.removeFilter(SearchFilterKind.CATEGORY)

        assertFalse(state.filters.hasActiveFilters())
        assertEquals(null, state.selectedCategory)
    }

    @Test
    fun signOut_clearsSessionAndSearchState() {
        val state = freshState()

        state.selectRole(UserRole.Admin)
        state.continueWithSelectedRole()
        state.updateQuery("Lehenga")
        state.submitSearch()

        state.signOut()

        assertFalse(state.isAuthenticated)
        assertEquals(NotWhatTab.Home, state.activeTab)
        assertEquals(emptyList(), state.recentSearches)
    }

    @Test
    fun authState_defaultsToMockMode() {
        val state = freshState()

        assertEquals(BackendFlowMode.MOCK, state.authState.backendMode)
    }
}

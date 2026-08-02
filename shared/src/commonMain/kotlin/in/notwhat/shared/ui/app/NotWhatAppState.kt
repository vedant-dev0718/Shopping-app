package com.notwhat.shared.ui

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.notwhat.shared.auth.AuthState
import com.notwhat.shared.di.ServiceLocator
import com.notwhat.shared.search.RecentSearchesUseCase
import com.notwhat.shared.search.SearchFilterKind
import com.notwhat.shared.search.SearchFilters
import com.notwhat.shared.search.SearchResults
import com.notwhat.shared.session.UserRole
import com.notwhat.shared.session.UserSession
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class NotWhatAppState {
    private var lockedRole: UserRole? = null

    private val serviceLocator = ServiceLocator()
    private val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())
    private val searchUseCase = serviceLocator.searchUseCase
    internal val bargainUseCase = serviceLocator.bargainUseCase

    var entryStage by mutableStateOf(AppEntryStage.Splash)
        private set

    var activeTab by mutableStateOf(NotWhatTab.Home)
        private set

    val authState = AuthState(
        useCase = serviceLocator.authUseCase,
        persistence = serviceLocator.authPersistence,
        config = serviceLocator.config,
    )

    internal val content = BuyerContentState(
        catalogUseCase = serviceLocator.catalogUseCase,
        discoveryRepository = serviceLocator.discoveryRepository,
    )

    internal val transaction = BuyerTransactionState(
        cartUseCase = serviceLocator.cartUseCase,
        orderUseCase = serviceLocator.orderUseCase,
        addressRepository = serviceLocator.addressRepository,
    )

    internal val sellerContent = SellerContentState(
        sellerUseCase = serviceLocator.sellerUseCase,
    )

    val selectedRole: UserRole
        get() = authState.selectedMockRole

    val currentSession: UserSession?
        get() = authState.currentSession

    var query by mutableStateOf("")
        private set

    var filters by mutableStateOf(SearchFilters())
        private set

    var recentSearches by mutableStateOf(listOf<String>())
        private set

    var searchResults by mutableStateOf<SearchResults?>(null)
        private set
    var isSearching by mutableStateOf(false)
        private set

    var selectedCategory by mutableStateOf<String?>(null)
        private set

    private val recentSearchesUseCase = RecentSearchesUseCase()

    val isAuthenticated: Boolean
        get() = authState.isAuthenticated

    val isRoleLocked: Boolean
        get() = lockedRole != null

    val uiRole: UserRole
        get() = lockedRole ?: currentSession?.role ?: authState.selectedMockRole

    fun completeSplash() {
        if (entryStage == AppEntryStage.Splash) {
            entryStage = AppEntryStage.Auth
        }
    }

    fun continueFromRoleSelection() {
        entryStage = AppEntryStage.Auth
    }

    fun configureRoleApp(role: UserRole) {
        lockedRole = role
        authState.selectedMockRole = role
        authState.loginAsAdmin = role == UserRole.Admin
        if (!isAuthenticated) {
            entryStage = AppEntryStage.Auth
        }
    }

    fun selectTab(tab: NotWhatTab) {
        activeTab = tab
    }

    fun selectRole(role: UserRole) {
        authState.selectedMockRole = role
    }

    fun continueWithSelectedRole() {
        authState.signInMockRole(selectedRole)
        routeAuthenticatedUser(selectedRole)
    }

    fun routeAuthenticatedUser(role: UserRole) {
        activeTab = when (role) {
            UserRole.Buyer -> NotWhatTab.Home
            UserRole.Seller -> NotWhatTab.Bargains
            UserRole.Admin -> NotWhatTab.Account
        }
    }

    fun signOut() {
        authState.signOut()
        authState.selectedMockRole = lockedRole ?: UserRole.Buyer
        authState.loginAsAdmin = lockedRole == UserRole.Admin
        entryStage = AppEntryStage.Auth
        activeTab = NotWhatTab.Home
        query = ""
        filters = SearchFilters()
        selectedCategory = null
        searchResults = null
        recentSearches = recentSearchesUseCase.clear()
    }

    fun updateQuery(value: String) {
        query = value
    }

    fun updateFilters(newFilters: SearchFilters) {
        filters = newFilters
    }

    fun selectCategory(category: String?) {
        selectedCategory = category
        filters = filters.copy(category = category)
    }

    fun clearFilters() {
        filters = SearchFilters()
        selectedCategory = null
    }

    fun submitSearch() {
        val term = query.trim()
        if (term.isNotEmpty()) {
            recentSearches = recentSearchesUseCase.remember(recentSearches, term)
            isSearching = true
            scope.launch {
                searchResults = searchUseCase.search(term, selectedCategory)
                isSearching = false
            }
        } else {
            searchResults = null
        }
    }

    fun removeFilter(kind: SearchFilterKind) {
        filters = filters.remove(kind)
        if (kind == SearchFilterKind.CATEGORY) {
            selectedCategory = null
        }
    }

    fun clearRecentSearches() {
        recentSearches = recentSearchesUseCase.clear()
    }
}

enum class AppEntryStage {
    Splash,
    RoleSelection,
    Auth,
}

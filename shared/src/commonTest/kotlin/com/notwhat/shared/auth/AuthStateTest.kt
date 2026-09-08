package com.notwhat.shared.auth

import com.notwhat.shared.config.BackendFlowMode
import com.notwhat.shared.core.AppConfig
import com.notwhat.shared.di.ServiceLocator
import com.notwhat.shared.session.UserRole
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class AuthStateTest {
    private fun freshState(): AuthState {
        AuthPersistenceStore.clearAll()
        val locator = ServiceLocator(AppConfig(BackendFlowMode.MOCK))
        locator.authPersistence.saveBackendMode(BackendFlowMode.MOCK)
        return AuthState(useCase = locator.authUseCase, persistence = locator.authPersistence, config = locator.config)
    }

    @Test
    fun login_inMockModeCreatesSelectedRoleSession() {
        val state = freshState()
        state.loginEmail = "buyer@example.com"
        state.loginPassword = "Password123!"
        state.selectedMockRole = UserRole.Seller

        kotlinx.coroutines.runBlocking { state.submitLogin() }

        assertTrue(state.isAuthenticated)
        assertEquals(UserRole.Seller, state.currentSession?.role)
    }

    @Test
    fun loginFromBuyerAppRejectsSellerAccount() {
        AuthPersistenceStore.clearAll()
        val locator = ServiceLocator(AppConfig(BackendFlowMode.MOCK))
        locator.authPersistence.saveBackendMode(BackendFlowMode.MOCK)
        val state =
            AuthState(
                useCase = locator.authUseCase,
                persistence = locator.authPersistence,
                config = locator.config,
                appRole = UserRole.Buyer,
            )
        state.loginEmail = "seller@example.com"
        state.loginPassword = "Password123!"
        state.selectedMockRole = UserRole.Seller

        kotlinx.coroutines.runBlocking { state.submitLogin() }

        assertFalse(state.isAuthenticated)
        assertTrue(state.errorMessage?.contains("Seller app") == true)
    }

    @Test
    fun buyerSignup_inMockModeMovesToVerification() {
        val state = freshState()
        state.buyerName = "Aanya"
        state.buyerEmail = "buyer@example.com"
        state.buyerPassword = "Password123!"
        state.buyerPhone = "9999999999"
        state.buyerAddress = "Jaipur"

        kotlinx.coroutines.runBlocking { state.submitBuyerSignup() }

        assertEquals(AuthDestination.VerifySignup, state.destination)
        assertEquals("buyer@example.com", state.pendingVerification?.email)
    }

    @Test
    fun signOut_resetsAuthState() {
        val state = freshState()
        state.loginEmail = "admin@example.com"
        state.loginPassword = "Password123!"
        state.loginAsAdmin = true

        kotlinx.coroutines.runBlocking { state.submitLogin() }
        state.signOut()

        assertFalse(state.isAuthenticated)
        assertEquals(AuthDestination.Login, state.destination)
        assertEquals(BackendFlowMode.MOCK, state.backendMode)
    }

    // ------------------------------------------------------------------
    // Persistence restoration
    // ------------------------------------------------------------------

    @Test
    fun sessionIsRestoredAfterRestart() {
        val state = freshState()
        state.loginEmail = "buyer@example.com"
        state.loginPassword = "Password123!"
        kotlinx.coroutines.runBlocking { state.submitLogin() }
        assertTrue(state.isAuthenticated)

        // simulate restart — persistence store is intact
        val restored = AuthState()
        assertTrue(restored.isAuthenticated)
        assertEquals(UserRole.Buyer, restored.currentSession?.role)
    }

    @Test
    fun backendModeIsRestoredAfterRestart() {
        val state = freshState()
        state.updateBackendMode(BackendFlowMode.LIVE)
        assertEquals(BackendFlowMode.LIVE, state.backendMode)

        val restored = AuthState()
        assertEquals(BackendFlowMode.LIVE, restored.backendMode)
    }

    // ------------------------------------------------------------------
    // Seller signup
    // ------------------------------------------------------------------

    @Test
    fun sellerSignup_inMockModeMovesToVerification() {
        val state = freshState()
        state.sellerName = "Jaipur Looms"
        state.sellerEmail = "seller@example.com"
        state.sellerPassword = "Password123!"
        state.sellerPhone = "9876543210"
        state.sellerStoreName = "Urban Threads"
        state.sellerStoreCategory = "Streetwear"
        state.sellerLocality = "Andheri West"
        state.sellerCity = "Mumbai"
        state.sellerState = "Maharashtra"
        state.sellerPincode = "400053"
        state.sellerSpecialtyRegion = "Mumbai Streetwear"
        state.sellerStoreDescription = "Handcrafted urban fashion."

        kotlinx.coroutines.runBlocking { state.submitSellerSignup() }

        assertEquals(AuthDestination.VerifySignup, state.destination)
        assertEquals("seller@example.com", state.pendingVerification?.email)
        assertEquals(UserRole.Seller, state.pendingVerification?.role)
    }

    // ------------------------------------------------------------------
    // Forgot password / reset password
    // ------------------------------------------------------------------

    @Test
    fun forgotPassword_inMockModeNavigatesToResetDestination() {
        val state = freshState()
        state.forgotEmail = "buyer@example.com"

        kotlinx.coroutines.runBlocking { state.sendResetCode() }

        assertEquals(AuthDestination.ResetPassword, state.destination)
        assertNotNull(state.infoMessage)
        assertNull(state.errorMessage)
    }

    @Test
    fun resetPassword_inMockModeReturnsToLogin() {
        val state = freshState()
        state.forgotEmail = "buyer@example.com"
        state.resetOtp = "123456"
        state.resetNewPassword = "NewPass123!"
        state.resetConfirmPassword = "NewPass123!"

        kotlinx.coroutines.runBlocking { state.resetPassword() }

        assertEquals(AuthDestination.Login, state.destination)
        assertNotNull(state.infoMessage)
        assertNull(state.errorMessage)
        assertEquals("", state.resetOtp)
    }

    // ------------------------------------------------------------------
    // Resend signup code
    // ------------------------------------------------------------------

    @Test
    fun resendSignupCode_inMockModePreservesVerification() {
        val state = freshState()
        state.buyerName = "Aanya"
        state.buyerEmail = "buyer@example.com"
        state.buyerPassword = "Password123!"
        state.buyerPhone = "9999999999"
        state.buyerAddress = "Jaipur"
        kotlinx.coroutines.runBlocking { state.submitBuyerSignup() }
        val originalId = state.pendingVerification?.verificationId

        kotlinx.coroutines.runBlocking { state.resendSignupCode() }

        assertEquals(AuthDestination.VerifySignup, state.destination)
        assertNotNull(state.infoMessage)
        assertEquals(originalId, state.pendingVerification?.verificationId)
    }

    @Test
    fun editSignupEmail_returnsToRoleSpecificFlow() {
        val state = freshState()

        // Fill seller fields so fallback heuristic would incorrectly choose seller.
        state.sellerStoreName = "Urban Threads"
        state.sellerEmail = "seller@example.com"

        state.buyerName = "Aanya"
        state.buyerEmail = "buyer@example.com"
        state.buyerPassword = "Password123!"
        state.buyerPhone = "9999999999"
        state.buyerAddress = "Jaipur"

        kotlinx.coroutines.runBlocking { state.submitBuyerSignup() }
        assertEquals(AuthDestination.VerifySignup, state.destination)

        state.editSignupEmail()
        assertEquals(AuthDestination.BuyerSignup, state.destination)
    }

    // ------------------------------------------------------------------
    // Validation guards
    // ------------------------------------------------------------------

    @Test
    fun canLogin_isFalseUntilBothFieldsPresent() {
        val state = freshState()
        assertFalse(state.canLogin)
        state.loginEmail = "a@b.com"
        assertFalse(state.canLogin)
        state.loginPassword = "Password123!"
        assertTrue(state.canLogin)
    }

    @Test
    fun canSubmitBuyerSignup_requiresAllFields() {
        val state = freshState()
        assertFalse(state.canSubmitBuyerSignup)
        state.buyerName = "Aanya"
        state.buyerEmail = "buyer@example.com"
        state.buyerPassword = "Password123!"
        state.buyerPhone = "9999999999"
        // address still missing
        assertFalse(state.canSubmitBuyerSignup)
        state.buyerAddress = "Jaipur"
        assertTrue(state.canSubmitBuyerSignup)
    }

    // ------------------------------------------------------------------
    // Change password
    // ------------------------------------------------------------------

    @Test
    fun changePassword_inMockModeSucceedsAndClearsFields() {
        val state = freshState()
        state.loginEmail = "buyer@example.com"
        state.loginPassword = "Password123!"
        kotlinx.coroutines.runBlocking { state.submitLogin() }

        state.changePasswordCurrent = "Password123!"
        state.changePasswordNew = "NewPass456!"
        state.changePasswordConfirm = "NewPass456!"

        kotlinx.coroutines.runBlocking { state.submitChangePassword() }

        assertEquals("Password changed successfully.", state.infoMessage)
        assertEquals("", state.changePasswordCurrent)
        assertEquals("", state.changePasswordNew)
        assertEquals("", state.changePasswordConfirm)
        assertNull(state.errorMessage)
    }

    @Test
    fun changePassword_failsWhenNotSignedIn() {
        val state = freshState()
        state.changePasswordCurrent = "Password123!"
        state.changePasswordNew = "NewPass456!"
        state.changePasswordConfirm = "NewPass456!"

        kotlinx.coroutines.runBlocking { state.submitChangePassword() }

        assertNotNull(state.errorMessage)
        assertFalse(state.isAuthenticated)
    }

    @Test
    fun changePassword_failsWhenPasswordsMismatch() {
        val state = freshState()
        state.loginEmail = "buyer@example.com"
        state.loginPassword = "Password123!"
        kotlinx.coroutines.runBlocking { state.submitLogin() }

        state.changePasswordCurrent = "Password123!"
        state.changePasswordNew = "NewPass456!"
        state.changePasswordConfirm = "DifferentPass!"
        assertFalse(state.canChangePassword)
    }
}

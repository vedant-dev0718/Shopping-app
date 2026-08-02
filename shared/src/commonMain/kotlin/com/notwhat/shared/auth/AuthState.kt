package com.notwhat.shared.auth

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.notwhat.shared.auth.CompleteSellerProfileRequestDto
import com.notwhat.shared.config.BackendFlowMode
import com.notwhat.shared.core.AppConfig
import com.notwhat.shared.core.NetworkResult
import com.notwhat.shared.di.ServiceLocator
import com.notwhat.shared.domain.auth.AuthUseCase
import com.notwhat.shared.session.UserRole
import com.notwhat.shared.session.UserSession
import com.notwhat.shared.session.seedSessionForRole
import com.notwhat.shared.util.QaClockFormatter

enum class AuthDestination {
    Login,
    BuyerSignup,
    SellerSignup,
    VerifySignup,
    ForgotPassword,
    ResetPassword,
}

/**
 * Compose-state ViewModel for authentication screens.
 *
 * Owns only UI state (form fields, loading flag, messages, navigation destination).
 * Business logic and mock/live branching live in [AuthUseCase].
 */
class AuthState(
    private val useCase: AuthUseCase = ServiceLocator().authUseCase,
    private val persistence: SharedAuthPersistence = SharedAuthPersistence(),
    private val config: AppConfig = ServiceLocator().config,
) {
    enum class SocialAuthOutcome {
        Started,
        CredentialReturned,
        Cancelled,
        Failed,
        Success,
    }

    var backendMode by mutableStateOf(config.backendMode)
        private set

    var destination by mutableStateOf(AuthDestination.Login)
        private set

    var currentSession by mutableStateOf<UserSession?>(null)
        private set

    var isLoading by mutableStateOf(false)
        private set

    var infoMessage by mutableStateOf<String?>(null)
        private set

    var errorMessage by mutableStateOf<String?>(null)
        private set

    var socialAuthDebugStatus by mutableStateOf<String?>(null)
        private set

    var loginEmail by mutableStateOf("")
    var loginPassword by mutableStateOf("")
    var loginAsAdmin by mutableStateOf(false)
    var selectedMockRole by mutableStateOf(UserRole.Buyer)

    var buyerName by mutableStateOf("")
    var buyerEmail by mutableStateOf("")
    var buyerPassword by mutableStateOf("")
    var buyerPhone by mutableStateOf("")
    var buyerAddress by mutableStateOf("")

    var sellerName by mutableStateOf("")
    var sellerEmail by mutableStateOf("")
    var sellerPassword by mutableStateOf("")
    var sellerPhone by mutableStateOf("")
    var sellerStoreName by mutableStateOf("")
    var sellerStoreCategory by mutableStateOf("")
    var sellerLocality by mutableStateOf("")
    var sellerCity by mutableStateOf("")
    var sellerState by mutableStateOf("")
    var sellerPincode by mutableStateOf("")
    var sellerCountry by mutableStateOf("India")
    var sellerSpecialtyRegion by mutableStateOf("")
    var sellerStoreDescription by mutableStateOf("")

    var verificationCode by mutableStateOf("")
    var pendingVerification by mutableStateOf<PendingSignupVerification?>(null)
        private set

    var forgotEmail by mutableStateOf("")
    var resetOtp by mutableStateOf("")
    var resetNewPassword by mutableStateOf("")
    var resetConfirmPassword by mutableStateOf("")

    var changePasswordCurrent by mutableStateOf("")
    var changePasswordNew by mutableStateOf("")
    var changePasswordConfirm by mutableStateOf("")

    val isAuthenticated: Boolean get() = currentSession != null

    val canLogin: Boolean
        get() = loginEmail.trim().isNotEmpty() && loginPassword.isNotEmpty() && !isLoading

    val isBuyerPasswordValid: Boolean get() = isPasswordValid(buyerPassword)

    val canSubmitBuyerSignup: Boolean
        get() = buyerName.trim().isNotEmpty() && buyerEmail.trim().isNotEmpty() &&
            buyerPhone.trim().isNotEmpty() && buyerAddress.trim().isNotEmpty() &&
            isBuyerPasswordValid && !isLoading

    val isSellerPasswordValid: Boolean get() = isPasswordValid(sellerPassword)

    val canSubmitSellerSignup: Boolean
        get() = sellerName.trim().isNotEmpty() && sellerEmail.trim().isNotEmpty() &&
            sellerPhone.trim().isNotEmpty() && sellerStoreName.trim().isNotEmpty() &&
            sellerStoreCategory.trim().isNotEmpty() && sellerLocality.trim().isNotEmpty() &&
            sellerCity.trim().isNotEmpty() && sellerState.trim().isNotEmpty() &&
            sellerPincode.trim().isNotEmpty() && sellerSpecialtyRegion.trim().isNotEmpty() &&
            sellerStoreDescription.trim().isNotEmpty() && isSellerPasswordValid && !isLoading

    val requiresSellerProfileSetup: Boolean
        get() = currentSession?.requiresSellerProfileSetup == true

    val canCompleteSellerProfileSetup: Boolean
        get() = sellerStoreName.trim().isNotEmpty() &&
            sellerStoreCategory.trim().isNotEmpty() &&
            sellerCity.trim().isNotEmpty() &&
            sellerState.trim().isNotEmpty() &&
            sellerSpecialtyRegion.trim().isNotEmpty() &&
            sellerStoreDescription.trim().isNotEmpty() && !isLoading

    val canVerifySignup: Boolean get() = verificationCode.trim().length == 6 && !isLoading
    val canSendResetCode: Boolean get() = forgotEmail.trim().isNotEmpty() && !isLoading
    val canResetPassword: Boolean
        get() = resetOtp.trim().length == 6 && resetNewPassword.isNotEmpty() &&
            resetConfirmPassword.isNotEmpty() && !isLoading
    val canChangePassword: Boolean
        get() = changePasswordCurrent.isNotEmpty() && isPasswordValid(changePasswordNew) &&
            changePasswordNew == changePasswordConfirm && !isLoading

    init {
        val savedMode = persistence.loadBackendMode()
        config.setBackendMode(savedMode)
        backendMode = savedMode
        currentSession = persistence.loadSession()
    }

    fun updateBackendMode(mode: BackendFlowMode) {
        config.setBackendMode(mode)
        backendMode = mode
        persistence.saveBackendMode(mode)
    }

    fun openBuyerSignup() { clearMessages(); destination = AuthDestination.BuyerSignup }
    fun openSellerSignup() { clearMessages(); destination = AuthDestination.SellerSignup }
    fun openForgotPassword() { clearMessages(); destination = AuthDestination.ForgotPassword }

    fun backToLogin() {
        clearMessages()
        pendingVerification = null
        verificationCode = ""
        destination = AuthDestination.Login
    }

    fun signOut() {
        currentSession = null
        persistence.clearSession()
        clearMessages()
        socialAuthDebugStatus = null
        pendingVerification = null
        verificationCode = ""
        destination = AuthDestination.Login
    }

    fun clearSocialAuthDebugStatus() { socialAuthDebugStatus = null }

    fun signInMockRole(role: UserRole) {
        selectedMockRole = role
        persistSession(seedSessionForRole(role))
        clearMessages()
    }

    // ------------------------------------------------------------------
    // Auth actions — delegate to AuthUseCase, handle NetworkResult here
    // ------------------------------------------------------------------

    suspend fun submitLogin() {
        if (!canLogin) { errorMessage = "Enter your email and password to continue."; return }
        runLoading {
            useCase.login(
                email = loginEmail.trim(),
                password = loginPassword,
                isAdmin = loginAsAdmin,
                selectedRole = if (loginAsAdmin) UserRole.Admin else selectedMockRole,
            ).foldIntoState()
        }
    }

    suspend fun signInWithGoogle() {
        val role = currentSocialRole()
        runSocialLoading("Google", role) {
            val payload = PlatformSocialAuthBridge.signInWithGoogle(role)
            updateSocialAuthDebugStatus("Google", SocialAuthOutcome.CredentialReturned,
                "Platform credential returned (token chars: ${payload.idToken.length}).")
            useCase.continueWithGoogle(payload.idToken, role).foldIntoState()
        }
    }

    suspend fun signInWithApple() {
        val role = currentSocialRole()
        runSocialLoading("Apple", role) {
            val payload = PlatformSocialAuthBridge.signInWithApple(role)
            updateSocialAuthDebugStatus("Apple", SocialAuthOutcome.CredentialReturned,
                "Platform credential returned (token chars: ${payload.idToken.length}).")
            useCase.continueWithApple(payload.idToken, payload.fullName, role).foldIntoState()
        }
    }

    suspend fun submitBuyerSignup() {
        if (!canSubmitBuyerSignup) {
            errorMessage = "Fill every field and use a password with at least 8 characters."
            return
        }
        runLoading {
            val result = useCase.startBuyerSignup(
                BuyerSignupRequestDto(
                    name = buyerName.trim(), email = buyerEmail.trim(), password = buyerPassword,
                    phone = buyerPhone.trim(), address = buyerAddress.trim(),
                ),
            )
            when (result) {
                is NetworkResult.Success -> {
                    pendingVerification = result.data
                    infoMessage = "Verification code sent to ${buyerEmail.trim()}."
                    destination = AuthDestination.VerifySignup
                }
                is NetworkResult.Failure -> errorMessage = result.error.userMessage()
            }
        }
    }

    suspend fun submitSellerSignup() {
        if (!canSubmitSellerSignup) {
            errorMessage = "Complete your account and store details before continuing."
            return
        }
        runLoading {
            val result = useCase.startSellerSignup(
                SellerSignupRequestDto(
                    name = sellerName.trim(), email = sellerEmail.trim(), password = sellerPassword,
                    phone = sellerPhone.trim(), storeName = sellerStoreName.trim(),
                    storeCategory = sellerStoreCategory.trim(), locality = sellerLocality.trim(),
                    city = sellerCity.trim(), state = sellerState.trim(), pincode = sellerPincode.trim(),
                    country = sellerCountry.trim().ifEmpty { "India" },
                    specialtyRegion = sellerSpecialtyRegion.trim(),
                    storeDescription = sellerStoreDescription.trim(),
                ),
            )
            when (result) {
                is NetworkResult.Success -> {
                    pendingVerification = result.data
                    infoMessage = "Verification code sent to ${sellerEmail.trim()}."
                    destination = AuthDestination.VerifySignup
                }
                is NetworkResult.Failure -> errorMessage = result.error.userMessage()
            }
        }
    }

    suspend fun verifySignup() {
        val verification = pendingVerification
        if (verification == null) { errorMessage = "Start signup again to get a verification code."; return }
        if (!canVerifySignup) { errorMessage = "Enter the 6-digit code from your email."; return }
        runLoading {
            when (val result = useCase.verifySignupEmail(verification, verificationCode.trim())) {
                is NetworkResult.Success -> {
                    persistSession(result.data)
                    pendingVerification = null
                    verificationCode = ""
                    destination = AuthDestination.Login
                }
                is NetworkResult.Failure -> errorMessage = result.error.userMessage()
            }
        }
    }

    suspend fun resendSignupCode() {
        val verification = pendingVerification ?: return
        runLoading {
            when (val result = useCase.resendSignupCode(verification)) {
                is NetworkResult.Success -> {
                    pendingVerification = result.data
                    verificationCode = ""
                    infoMessage = "A new verification code was sent."
                }
                is NetworkResult.Failure -> errorMessage = result.error.userMessage()
            }
        }
    }

    fun editSignupEmail() {
        clearMessages()
        pendingVerification = null
        verificationCode = ""
        destination = if (sellerEmail.trim().isNotEmpty() && sellerStoreName.trim().isNotEmpty()) {
            AuthDestination.SellerSignup
        } else {
            AuthDestination.BuyerSignup
        }
    }

    suspend fun sendResetCode() {
        if (!canSendResetCode) { errorMessage = "Enter your email to receive a reset code."; return }
        runLoading {
            when (val result = useCase.sendResetCode(forgotEmail.trim())) {
                is NetworkResult.Success -> {
                    infoMessage = "We sent a 6-digit reset code to ${result.data.email}."
                    destination = AuthDestination.ResetPassword
                }
                is NetworkResult.Failure -> errorMessage = result.error.userMessage()
            }
        }
    }

    suspend fun resetPassword() {
        if (!canResetPassword) { errorMessage = "Enter the 6-digit code and your new password."; return }
        if (resetNewPassword != resetConfirmPassword) { errorMessage = "Passwords do not match."; return }
        runLoading {
            when (val result = useCase.resetPassword(forgotEmail.trim(), resetOtp.trim(), resetNewPassword)) {
                is NetworkResult.Success -> {
                    infoMessage = "Password reset successfully. Log in with your new password."
                    resetOtp = ""; resetNewPassword = ""; resetConfirmPassword = ""
                    destination = AuthDestination.Login
                }
                is NetworkResult.Failure -> errorMessage = result.error.userMessage()
            }
        }
    }

    suspend fun submitChangePassword() {
        val token = currentSession?.authToken
        if (token.isNullOrBlank()) { errorMessage = "You must be signed in to change your password."; return }
        if (!canChangePassword) { errorMessage = "Enter your current password and a matching new password (min 8 chars)."; return }
        runLoading {
            when (val result = useCase.changePassword(token, changePasswordCurrent, changePasswordNew)) {
                is NetworkResult.Success -> {
                    changePasswordCurrent = ""
                    changePasswordNew = ""
                    changePasswordConfirm = ""
                    infoMessage = "Password changed successfully."
                }
                is NetworkResult.Failure -> errorMessage = result.error.userMessage()
            }
        }
    }

    suspend fun completeSellerProfileSetup() {
        if (!requiresSellerProfileSetup) return
        if (!canCompleteSellerProfileSetup) {
            errorMessage = "Complete your store profile to continue."
            return
        }

        val token = currentSession?.authToken
        if (token.isNullOrBlank()) {
            errorMessage = "Your session expired. Please sign in again."
            return
        }

        runLoading {
            when (
                val result = useCase.completeSellerProfile(
                    authToken = token,
                    request = CompleteSellerProfileRequestDto(
                        storeName = sellerStoreName.trim(),
                        storeCategory = sellerStoreCategory.trim(),
                        locality = sellerLocality.trim(),
                        city = sellerCity.trim(),
                        state = sellerState.trim(),
                        pincode = sellerPincode.trim(),
                        country = sellerCountry.trim().ifEmpty { "India" },
                        specialtyRegion = sellerSpecialtyRegion.trim(),
                        storeDescription = sellerStoreDescription.trim(),
                        phone = sellerPhone.trim().ifEmpty { null },
                    ),
                )
            ) {
                is NetworkResult.Success -> {
                    persistSession(result.data)
                    infoMessage = "Seller profile setup completed."
                }
                is NetworkResult.Failure -> errorMessage = result.error.userMessage()
            }
        }
    }

    // ------------------------------------------------------------------
    // Private helpers
    // ------------------------------------------------------------------

    private suspend fun runLoading(block: suspend () -> Unit) {
        isLoading = true
        errorMessage = null
        try {
            block()
        } catch (e: Throwable) {
            errorMessage = e.message ?: "Something went wrong. Please try again."
        } finally {
            isLoading = false
        }
    }

    private suspend fun runSocialLoading(provider: String, role: UserRole, block: suspend () -> Unit) {
        isLoading = true
        errorMessage = null
        updateSocialAuthDebugStatus(provider, SocialAuthOutcome.Started,
            "Started in ${backendMode.rawValue} mode as ${role.title}.")
        try {
            block()
            updateSocialAuthDebugStatus(provider, SocialAuthOutcome.Success, "Backend exchange succeeded.")
        } catch (e: Throwable) {
            val msg = e.message ?: "Something went wrong. Please try again."
            errorMessage = msg
            updateSocialAuthDebugStatus(provider,
                if (isCancellationMessage(msg)) SocialAuthOutcome.Cancelled else SocialAuthOutcome.Failed, msg)
        } finally {
            isLoading = false
        }
    }

    /** Convenience: folds a [NetworkResult]<[UserSession]> into [currentSession] / [errorMessage]. */
    private fun NetworkResult<UserSession>.foldIntoState() {
        when (this) {
            is NetworkResult.Success -> persistSession(data)
            is NetworkResult.Failure -> errorMessage = error.userMessage()
        }
    }

    private fun clearMessages() { infoMessage = null; errorMessage = null }

    private fun updateSocialAuthDebugStatus(provider: String, outcome: SocialAuthOutcome, detail: String) {
        socialAuthDebugStatus = "[t=${QaClockFormatter.nowHms()}][$provider][$outcome] $detail"
    }

    private fun isCancellationMessage(message: String) = message.contains("cancel", ignoreCase = true)

    private fun persistSession(session: UserSession) {
        currentSession = session
        persistence.saveSession(session)
    }

    private fun currentSocialRole(): UserRole = when (destination) {
        AuthDestination.SellerSignup -> UserRole.Seller
        AuthDestination.BuyerSignup -> UserRole.Buyer
        else -> if (loginAsAdmin) UserRole.Admin else selectedMockRole
    }

    private fun isPasswordValid(password: String) =
        password.length >= 8 &&
            password.any(Char::isUpperCase) &&
            password.any(Char::isDigit) &&
            password.any { !it.isLetterOrDigit() }
}

package com.notwhat.shared.domain.auth

import com.notwhat.shared.auth.AuthRepository
import com.notwhat.shared.auth.BuyerSignupRequestDto
import com.notwhat.shared.auth.ChangePasswordResponseDto
import com.notwhat.shared.auth.CompleteSellerProfileRequestDto
import com.notwhat.shared.auth.ForgotPasswordResponseDto
import com.notwhat.shared.auth.PendingSignupVerification
import com.notwhat.shared.auth.ResetPasswordResponseDto
import com.notwhat.shared.auth.SellerSignupRequestDto
import com.notwhat.shared.core.AppConfig
import com.notwhat.shared.core.NetworkResult
import com.notwhat.shared.session.UserRole
import com.notwhat.shared.session.UserSession

/**
 * Domain-layer use-case for authentication flows.
 *
 * Owns the mock/live decision so that [AuthRepository] only handles live
 * network calls and the [com.notwhat.shared.auth.AuthState] ViewModel only
 * drives UI state. Call sites never inspect [AppConfig.isMock] directly.
 */
class AuthUseCase(
    private val config: AppConfig,
    private val repository: AuthRepository,
) {
    // ------------------------------------------------------------------
    // Login
    // ------------------------------------------------------------------

    @Suppress("UNUSED_PARAMETER")
    suspend fun login(
        email: String,
        password: String,
        isAdmin: Boolean,
        selectedRole: UserRole,
    ): NetworkResult<UserSession> = repository.login(email, password, isAdmin)

    // ------------------------------------------------------------------
    // Social auth
    // ------------------------------------------------------------------

    suspend fun continueWithGoogle(
        idToken: String,
        role: UserRole,
    ): NetworkResult<UserSession> = repository.continueWithGoogle(idToken, role)

    suspend fun continueWithApple(
        identityToken: String,
        fullName: String?,
        role: UserRole,
    ): NetworkResult<UserSession> = repository.continueWithApple(identityToken, fullName, role)

    // ------------------------------------------------------------------
    // Signup
    // ------------------------------------------------------------------

    suspend fun startBuyerSignup(request: BuyerSignupRequestDto): NetworkResult<PendingSignupVerification> =
        repository.startBuyerSignup(request)

    suspend fun startSellerSignup(request: SellerSignupRequestDto): NetworkResult<PendingSignupVerification> =
        repository.startSellerSignup(request)

    suspend fun verifySignupEmail(
        verification: PendingSignupVerification,
        otp: String,
    ): NetworkResult<UserSession> = repository.verifySignupEmail(verification.verificationId, otp)

    suspend fun resendSignupCode(verification: PendingSignupVerification): NetworkResult<PendingSignupVerification> =
        repository.resendSignupCode(verification.verificationId)

    // ------------------------------------------------------------------
    // Password reset
    // ------------------------------------------------------------------

    suspend fun sendResetCode(email: String): NetworkResult<ForgotPasswordResponseDto> = repository.sendResetCode(email)

    suspend fun resetPassword(
        email: String,
        otp: String,
        newPassword: String,
    ): NetworkResult<ResetPasswordResponseDto> = repository.resetPassword(email, otp, newPassword)

    suspend fun completeSellerProfile(
        authToken: String,
        request: CompleteSellerProfileRequestDto,
    ): NetworkResult<UserSession> = repository.completeSellerProfile(authToken, request)

    suspend fun changePassword(
        authToken: String,
        currentPassword: String,
        newPassword: String,
    ): NetworkResult<ChangePasswordResponseDto> = repository.changePassword(authToken, currentPassword, newPassword)
}

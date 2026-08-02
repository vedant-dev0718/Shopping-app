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
import com.notwhat.shared.session.seedSessionForRole

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

    suspend fun login(
        email: String,
        password: String,
        isAdmin: Boolean,
        selectedRole: UserRole,
    ): NetworkResult<UserSession> {
        if (config.isMock) {
            val role = if (isAdmin) UserRole.Admin else selectedRole
            return NetworkResult.Success(seedSessionForRole(role))
        }
        return repository.login(email, password, isAdmin)
    }

    // ------------------------------------------------------------------
    // Social auth
    // ------------------------------------------------------------------

    suspend fun continueWithGoogle(idToken: String, role: UserRole): NetworkResult<UserSession> {
        if (config.isMock) return NetworkResult.Success(seedSessionForRole(role))
        return repository.continueWithGoogle(idToken, role)
    }

    suspend fun continueWithApple(identityToken: String, fullName: String?, role: UserRole): NetworkResult<UserSession> {
        if (config.isMock) return NetworkResult.Success(seedSessionForRole(role))
        return repository.continueWithApple(identityToken, fullName, role)
    }

    // ------------------------------------------------------------------
    // Signup
    // ------------------------------------------------------------------

    suspend fun startBuyerSignup(request: BuyerSignupRequestDto): NetworkResult<PendingSignupVerification> {
        if (config.isMock) {
            return NetworkResult.Success(
                PendingSignupVerification(
                    verificationId = "seed-buyer-verification",
                    email = request.email,
                    role = UserRole.Buyer,
                ),
            )
        }
        return repository.startBuyerSignup(request)
    }

    suspend fun startSellerSignup(request: SellerSignupRequestDto): NetworkResult<PendingSignupVerification> {
        if (config.isMock) {
            return NetworkResult.Success(
                PendingSignupVerification(
                    verificationId = "seed-seller-verification",
                    email = request.email,
                    role = UserRole.Seller,
                ),
            )
        }
        return repository.startSellerSignup(request)
    }

    suspend fun verifySignupEmail(
        verification: PendingSignupVerification,
        otp: String,
    ): NetworkResult<UserSession> {
        if (config.isMock) {
            val session = seedSessionForRole(verification.role)
            return NetworkResult.Success(
                session.copy(email = verification.email, authToken = "seed-token-${verification.role.name.lowercase()}"),
            )
        }
        return repository.verifySignupEmail(verification.verificationId, otp)
    }

    suspend fun resendSignupCode(verification: PendingSignupVerification): NetworkResult<PendingSignupVerification> {
        if (config.isMock) return NetworkResult.Success(verification)
        return repository.resendSignupCode(verification.verificationId)
    }

    // ------------------------------------------------------------------
    // Password reset
    // ------------------------------------------------------------------

    suspend fun sendResetCode(email: String): NetworkResult<ForgotPasswordResponseDto> {
        if (config.isMock) return NetworkResult.Success(ForgotPasswordResponseDto(email = email))
        return repository.sendResetCode(email)
    }

    suspend fun resetPassword(
        email: String,
        otp: String,
        newPassword: String,
    ): NetworkResult<ResetPasswordResponseDto> {
        if (config.isMock) {
            return NetworkResult.Success(ResetPasswordResponseDto(passwordReset = true, sessionsInvalidated = true))
        }
        return repository.resetPassword(email, otp, newPassword)
    }

    suspend fun completeSellerProfile(
        authToken: String,
        request: CompleteSellerProfileRequestDto,
    ): NetworkResult<UserSession> {
        if (config.isMock) {
            return NetworkResult.Success(seedSessionForRole(UserRole.Seller).copy(isSeeded = true, requiresSellerProfileSetup = false))
        }
        return repository.completeSellerProfile(authToken, request)
    }

    suspend fun changePassword(
        authToken: String,
        currentPassword: String,
        newPassword: String,
    ): NetworkResult<ChangePasswordResponseDto> {
        if (config.isMock) return NetworkResult.Success(ChangePasswordResponseDto(passwordChanged = true))
        return repository.changePassword(authToken, currentPassword, newPassword)
    }
}

package com.notwhat.shared.auth

import com.notwhat.shared.session.UserRole
import com.notwhat.shared.session.UserSession
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonNames

@OptIn(ExperimentalSerializationApi::class)
@Serializable
data class ApiEnvelope<T>(
    val success: Boolean,
    val message: String? = null,
    val data: T? = null,
)

@Serializable
enum class AuthRoleDto {
    @SerialName("buyer") BUYER,
    @SerialName("seller") SELLER,
    @SerialName("admin") ADMIN,
}

@Serializable
data class AuthProviderDto(
    val provider: String,
    val email: String? = null,
)

@OptIn(ExperimentalSerializationApi::class)
@Serializable
data class AuthUserDto(
    @JsonNames("id", "_id")
    val id: String = "",
    val name: String = "",
    val email: String = "",
    val role: AuthRoleDto,
    val phone: String? = null,
    val address: String? = null,
    val authProviders: List<AuthProviderDto>? = null,
)

@Serializable
data class AuthResponseDto(
    val token: String? = null,
    val user: AuthUserDto? = null,
    val requiresSellerProfileSetup: Boolean? = null,
    val requiresRoleSelection: Boolean? = null,
    val isNewUser: Boolean? = null,
)

@Serializable
data class SignupVerificationDto(
    val verificationId: String,
    val email: String,
    val role: AuthRoleDto,
    val expiresAt: String? = null,
    val resendAvailableAt: String? = null,
)

@Serializable
data class ForgotPasswordResponseDto(
    val email: String,
    val expiresAt: String? = null,
)

@Serializable
data class VerifyResetOtpResponseDto(
    val resetToken: String,
    val expiresInSeconds: Int,
)

@Serializable
data class ResetPasswordResponseDto(
    val passwordReset: Boolean,
    val sessionsInvalidated: Boolean,
)

@Serializable
data class LoginRequestDto(
    val email: String,
    val password: String,
)

@Serializable
data class BuyerSignupRequestDto(
    val name: String,
    val email: String,
    val password: String,
    val phone: String,
    val address: String,
)

@Serializable
data class SellerSignupRequestDto(
    val name: String,
    val email: String,
    val password: String,
    val phone: String,
    val storeName: String,
    val storeCategory: String,
    val locality: String,
    val city: String,
    val state: String,
    val pincode: String,
    val country: String,
    val specialtyRegion: String,
    val storeDescription: String,
)

@Serializable
data class CompleteSellerProfileRequestDto(
    val storeName: String,
    val storeCategory: String,
    val locality: String,
    val city: String,
    val state: String,
    val pincode: String,
    val country: String,
    val specialtyRegion: String,
    val storeDescription: String,
    val phone: String? = null,
)

@Serializable
data class ResendSignupCodeRequestDto(
    val verificationId: String,
)

@Serializable
data class VerifySignupEmailRequestDto(
    val verificationId: String,
    val otp: String,
)

@Serializable
data class ForgotPasswordRequestDto(
    val email: String,
)

@Serializable
data class VerifyResetOtpRequestDto(
    val email: String,
    val otp: String,
)

@Serializable
data class ResetPasswordRequestDto(
    val resetToken: String,
    val newPassword: String,
)

@Serializable
data class ChangePasswordRequestDto(
    val currentPassword: String,
    val newPassword: String,
)

@Serializable
data class ChangePasswordResponseDto(
    val passwordChanged: Boolean,
)

data class PendingSignupVerification(
    val verificationId: String,
    val email: String,
    val role: UserRole,
)

internal fun AuthRoleDto.toUserRole(): UserRole = when (this) {
    AuthRoleDto.BUYER -> UserRole.Buyer
    AuthRoleDto.SELLER -> UserRole.Seller
    AuthRoleDto.ADMIN -> UserRole.Admin
}

internal fun AuthResponseDto.toSession(isSeeded: Boolean): UserSession {
    val resolvedUser = requireNotNull(user) { "Missing user in auth response." }
    val resolvedRole = resolvedUser.role.toUserRole()
    return UserSession(
        role = resolvedRole,
        name = resolvedUser.name.ifBlank { resolvedRole.title },
        headline = when (resolvedRole) {
            UserRole.Buyer -> "Signed in and ready to browse regional fashion."
            UserRole.Seller -> "Signed in and ready to manage your storefront."
            UserRole.Admin -> "Signed in and ready to review marketplace operations."
        },
        email = resolvedUser.email,
        authToken = token,
        requiresSellerProfileSetup = requiresSellerProfileSetup == true,
        isSeeded = isSeeded,
    )
}
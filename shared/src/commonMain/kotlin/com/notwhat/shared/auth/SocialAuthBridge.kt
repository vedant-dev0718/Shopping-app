package com.notwhat.shared.auth

import com.notwhat.shared.session.UserRole

data class SocialAuthPayload(
    val idToken: String,
    val fullName: String? = null,
)

/** Thrown by platform social-auth bridges when the native handler fails or is unconfigured. */
class SharedAuthException(message: String) : Exception(message)

expect object PlatformSocialAuthBridge {
    val supportsGoogle: Boolean
    val supportsApple: Boolean

    suspend fun signInWithGoogle(role: UserRole): SocialAuthPayload

    suspend fun signInWithApple(role: UserRole): SocialAuthPayload
}
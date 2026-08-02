package com.notwhat.shared.auth

import com.notwhat.shared.session.UserRole

object AndroidSocialAuthBridgeRegistry {
    private var googleSignInHandler: (suspend (UserRole) -> SocialAuthPayload)? = null

    fun registerGoogleSignIn(handler: (suspend (UserRole) -> SocialAuthPayload)?) {
        googleSignInHandler = handler
    }

    fun hasGoogleSignIn(): Boolean = googleSignInHandler != null

    suspend fun performGoogleSignIn(role: UserRole): SocialAuthPayload {
        val handler = googleSignInHandler
            ?: throw SharedAuthException("Google sign-in is not configured on Android yet.")
        return handler(role)
    }
}

actual object PlatformSocialAuthBridge {
    actual val supportsGoogle: Boolean
        get() = AndroidSocialAuthBridgeRegistry.hasGoogleSignIn()

    actual val supportsApple: Boolean = false

    actual suspend fun signInWithGoogle(role: UserRole): SocialAuthPayload {
        return AndroidSocialAuthBridgeRegistry.performGoogleSignIn(role)
    }

    actual suspend fun signInWithApple(role: UserRole): SocialAuthPayload {
        throw SharedAuthException("Apple sign-in is not available on Android.")
    }
}
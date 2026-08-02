package com.notwhat.shared.auth

import com.notwhat.shared.session.UserRole
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlinx.coroutines.suspendCancellableCoroutine

object IosSocialAuthBridgeRegistry {
    private var googleHandler: ((((SocialAuthPayload?, String?) -> Unit)) -> Unit)? = null
    private var appleHandler: ((((SocialAuthPayload?, String?) -> Unit)) -> Unit)? = null

    fun registerGoogleSignIn(handler: ((((SocialAuthPayload?, String?) -> Unit)) -> Unit)?) {
        googleHandler = handler
    }

    fun registerAppleSignIn(handler: ((((SocialAuthPayload?, String?) -> Unit)) -> Unit)?) {
        appleHandler = handler
    }

    fun hasGoogleSignIn(): Boolean = googleHandler != null

    fun hasAppleSignIn(): Boolean = appleHandler != null

    suspend fun performGoogleSignIn(): SocialAuthPayload {
        return suspendCancellableCoroutine { continuation ->
            val handler = googleHandler
            if (handler == null) {
                continuation.resumeWithException(SharedAuthException("Google sign-in is not configured on iOS."))
                return@suspendCancellableCoroutine
            }

            handler { payload, errorMessage ->
                if (payload != null) {
                    continuation.resume(payload)
                } else {
                    continuation.resumeWithException(SharedAuthException(errorMessage ?: "Google sign-in failed."))
                }
            }
        }
    }

    suspend fun performAppleSignIn(): SocialAuthPayload {
        return suspendCancellableCoroutine { continuation ->
            val handler = appleHandler
            if (handler == null) {
                continuation.resumeWithException(SharedAuthException("Apple sign-in is not configured on iOS."))
                return@suspendCancellableCoroutine
            }

            handler { payload, errorMessage ->
                if (payload != null) {
                    continuation.resume(payload)
                } else {
                    continuation.resumeWithException(SharedAuthException(errorMessage ?: "Apple sign-in failed."))
                }
            }
        }
    }
}

actual object PlatformSocialAuthBridge {
    actual val supportsGoogle: Boolean
        get() = IosSocialAuthBridgeRegistry.hasGoogleSignIn()

    actual val supportsApple: Boolean
        get() = IosSocialAuthBridgeRegistry.hasAppleSignIn()

    actual suspend fun signInWithGoogle(role: UserRole): SocialAuthPayload {
        return IosSocialAuthBridgeRegistry.performGoogleSignIn()
    }

    actual suspend fun signInWithApple(role: UserRole): SocialAuthPayload {
        return IosSocialAuthBridgeRegistry.performAppleSignIn()
    }
}
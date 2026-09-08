package com.notwhat.shared.auth

import com.notwhat.shared.core.AppError
import com.notwhat.shared.core.NetworkResult
import com.notwhat.shared.core.runCatchingNetwork
import com.notwhat.shared.network.createPlatformHttpClient
import com.notwhat.shared.session.UserRole
import com.notwhat.shared.session.UserSession
import com.notwhat.shared.session.seedSessionForRole
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.ClientRequestException
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.ServerResponseException
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonPrimitive

/**
 * Data-layer repository for all auth endpoints.
 *
 * Dependencies are injected via the constructor so this class can be
 * instantiated through [com.notwhat.shared.di.ServiceLocator] with test
 * doubles replacing [httpClient] in unit tests.
 *
 * Every method returns [NetworkResult] — callers never need to catch exceptions.
 * Mock-mode branching is performed by [com.notwhat.shared.domain.auth.AuthUseCase];
 * this class only handles real network calls.
 */
@OptIn(ExperimentalSerializationApi::class)
class AuthRepository(
    private val baseUrl: String,
    private val httpClient: HttpClient = buildDefaultClient(),
) {
    private val normalizedBaseUrl = baseUrl.trimEnd('/')

    // ------------------------------------------------------------------
    // Login
    // ------------------------------------------------------------------

    suspend fun login(
        email: String,
        password: String,
        isAdmin: Boolean,
    ): NetworkResult<UserSession> =
        runCatchingNetwork {
            val path = if (isAdmin) "admin/login" else "auth/login"
            val response: AuthResponseDto =
                post(
                    path,
                    LoginRequestDto(
                        identifier = email,
                        email = email,
                        password = password,
                    ),
                )
            response.toSession(isSeeded = false)
        }

    // ------------------------------------------------------------------
    // Social auth
    // ------------------------------------------------------------------

    suspend fun continueWithGoogle(
        idToken: String,
        role: UserRole,
    ): NetworkResult<UserSession> =
        runCatchingNetwork {
            val response: AuthResponseDto =
                post(
                    "auth/google",
                    mapOf("idToken" to idToken, "role" to role.name.lowercase()),
                )
            response.toSession(isSeeded = false)
        }

    suspend fun continueWithApple(
        identityToken: String,
        fullName: String?,
        role: UserRole,
    ): NetworkResult<UserSession> =
        runCatchingNetwork {
            val response: AuthResponseDto =
                post(
                    "auth/apple",
                    mapOf(
                        "identityToken" to identityToken,
                        "fullName" to fullName,
                        "role" to role.name.lowercase(),
                    ),
                )
            response.toSession(isSeeded = false)
        }

    suspend fun completeSellerProfile(
        authToken: String,
        request: CompleteSellerProfileRequestDto,
    ): NetworkResult<UserSession> =
        runCatchingNetwork {
            val response: AuthResponseDto =
                post(
                    path = "auth/google/complete-profile",
                    body = request,
                    bearerToken = authToken,
                )
            response.toSession(isSeeded = false)
        }

    // ------------------------------------------------------------------
    // Signup
    // ------------------------------------------------------------------

    suspend fun startBuyerSignup(request: BuyerSignupRequestDto): NetworkResult<PendingSignupVerification> =
        runCatchingNetwork {
            val response: SignupVerificationDto = post("auth/signup/buyer/start", request)
            PendingSignupVerification(
                verificationId = response.verificationId,
                email = response.email,
                role = response.role.toUserRole(),
            )
        }

    suspend fun startSellerSignup(request: SellerSignupRequestDto): NetworkResult<PendingSignupVerification> =
        runCatchingNetwork {
            val response: SignupVerificationDto = post("auth/signup/seller/start", request)
            PendingSignupVerification(
                verificationId = response.verificationId,
                email = response.email,
                role = response.role.toUserRole(),
            )
        }

    suspend fun verifySignupEmail(
        verificationId: String,
        otp: String,
    ): NetworkResult<UserSession> =
        runCatchingNetwork {
            val response: AuthResponseDto =
                post(
                    "auth/signup/verify-email",
                    VerifySignupEmailRequestDto(verificationId = verificationId, otp = otp),
                )
            response.toSession(isSeeded = false)
        }

    suspend fun resendSignupCode(verificationId: String): NetworkResult<PendingSignupVerification> =
        runCatchingNetwork {
            val response: SignupVerificationDto =
                post(
                    "auth/signup/resend-code",
                    ResendSignupCodeRequestDto(verificationId = verificationId),
                )
            PendingSignupVerification(
                verificationId = response.verificationId,
                email = response.email,
                role = response.role.toUserRole(),
            )
        }

    // ------------------------------------------------------------------
    // Password reset
    // ------------------------------------------------------------------

    suspend fun sendResetCode(email: String): NetworkResult<ForgotPasswordResponseDto> =
        runCatchingNetwork { post("auth/forgot-password", ForgotPasswordRequestDto(email = email)) }

    suspend fun resetPassword(
        email: String,
        otp: String,
        newPassword: String,
    ): NetworkResult<ResetPasswordResponseDto> =
        runCatchingNetwork {
            val verified: VerifyResetOtpResponseDto =
                post(
                    "auth/verify-reset-otp",
                    VerifyResetOtpRequestDto(email = email, otp = otp),
                )
            post("auth/reset-password", ResetPasswordRequestDto(resetToken = verified.resetToken, newPassword = newPassword))
        }

    suspend fun changePassword(
        authToken: String,
        currentPassword: String,
        newPassword: String,
    ): NetworkResult<ChangePasswordResponseDto> =
        runCatchingNetwork {
            post(
                path = "auth/change-password",
                body = ChangePasswordRequestDto(currentPassword = currentPassword, newPassword = newPassword),
                bearerToken = authToken,
            )
        }

    // ------------------------------------------------------------------
    // Internal HTTP helpers
    // ------------------------------------------------------------------

    private suspend inline fun <reified Response : Any, reified Body : Any> post(
        path: String,
        body: Body,
        bearerToken: String? = null,
    ): Response {
        try {
            val httpResponse =
                httpClient.post("$normalizedBaseUrl/$path") {
                    contentType(ContentType.Application.Json)
                    if (!bearerToken.isNullOrBlank()) {
                        header(HttpHeaders.Authorization, "Bearer $bearerToken")
                    }
                    setBody(body)
                }
            val envelope = httpResponse.body<ApiEnvelope<Response>>()
            return envelope.data
                ?: throw AppError.Api(statusCode = 200, serverMessage = envelope.message ?: "Server returned no data.")
        } catch (e: AppError) {
            throw e
        } catch (e: ClientRequestException) {
            val msg = parseFailureMessage(runCatching { e.response.body<JsonObject>() }.getOrNull())
            throw AppError.Api(statusCode = e.response.status.value, serverMessage = msg)
        } catch (e: ServerResponseException) {
            throw AppError.Server(statusCode = e.response.status.value)
        } catch (e: Exception) {
            throw AppError.fromException(e)
        }
    }

    private fun parseFailureMessage(payload: JsonObject?): String = payload?.get("message")?.jsonPrimitive?.content ?: "Request failed."

    companion object {
        @OptIn(ExperimentalSerializationApi::class)
        private fun buildDefaultClient(): HttpClient {
            val json =
                Json {
                    ignoreUnknownKeys = true
                    explicitNulls = false
                }
            return createPlatformHttpClient {
                install(ContentNegotiation) { json(json) }
                install(HttpTimeout) {
                    requestTimeoutMillis = 60_000
                    connectTimeoutMillis = 15_000
                    socketTimeoutMillis = 300_000
                }
            }
        }
    }
}

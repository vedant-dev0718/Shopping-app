package com.notwhat.shared.network

import com.notwhat.shared.auth.ApiEnvelope
import com.notwhat.shared.core.AppError
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.ClientRequestException
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.ServerResponseException
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.delete
import io.ktor.client.request.forms.formData
import io.ktor.client.request.forms.submitFormWithBinaryData
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.patch
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.Headers
import io.ktor.http.HttpHeaders
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonPrimitive

/**
 * Thin Ktor wrapper shared by all feature repositories.
 * Unwraps [ApiEnvelope] and maps HTTP errors to [AppError].
 */
class ApiClient(
    private val baseUrl: String,
    val httpClient: HttpClient = buildDefaultClient(),
) {
    @PublishedApi internal val normalizedBase = baseUrl.trimEnd('/')

    suspend inline fun <reified R : Any> get(
        path: String,
        bearerToken: String? = null,
        params: Map<String, String?> = emptyMap(),
    ): R {
        try {
            val httpResponse =
                httpClient.get(buildUrl(path, params)) {
                    if (!bearerToken.isNullOrBlank()) header(HttpHeaders.Authorization, "Bearer $bearerToken")
                }
            return unwrap(httpResponse.body<ApiEnvelope<R>>())
        } catch (e: AppError) {
            throw e
        } catch (e: ClientRequestException) {
            throw AppError.Api(e.response.status.value, parseMessage(runCatching { e.response.body<JsonObject>() }.getOrNull()))
        } catch (e: ServerResponseException) {
            throw AppError.Server(e.response.status.value)
        } catch (e: Exception) {
            throw AppError.fromException(e)
        }
    }

    suspend inline fun <reified R : Any, reified B : Any> post(
        path: String,
        body: B,
        bearerToken: String? = null,
    ): R {
        try {
            val httpResponse =
                httpClient.post("$normalizedBase/$path") {
                    contentType(ContentType.Application.Json)
                    if (!bearerToken.isNullOrBlank()) header(HttpHeaders.Authorization, "Bearer $bearerToken")
                    setBody(body)
                }
            return unwrap(httpResponse.body<ApiEnvelope<R>>())
        } catch (e: AppError) {
            throw e
        } catch (e: ClientRequestException) {
            throw AppError.Api(e.response.status.value, parseMessage(runCatching { e.response.body<JsonObject>() }.getOrNull()))
        } catch (e: ServerResponseException) {
            throw AppError.Server(e.response.status.value)
        } catch (e: Exception) {
            throw AppError.fromException(e)
        }
    }

    suspend inline fun <reified R : Any, reified B : Any> patch(
        path: String,
        body: B,
        bearerToken: String? = null,
    ): R {
        try {
            val httpResponse =
                httpClient.patch("$normalizedBase/$path") {
                    contentType(ContentType.Application.Json)
                    if (!bearerToken.isNullOrBlank()) header(HttpHeaders.Authorization, "Bearer $bearerToken")
                    setBody(body)
                }
            return unwrap(httpResponse.body<ApiEnvelope<R>>())
        } catch (e: AppError) {
            throw e
        } catch (e: ClientRequestException) {
            throw AppError.Api(e.response.status.value, parseMessage(runCatching { e.response.body<JsonObject>() }.getOrNull()))
        } catch (e: ServerResponseException) {
            throw AppError.Server(e.response.status.value)
        } catch (e: Exception) {
            throw AppError.fromException(e)
        }
    }

    suspend inline fun <reified R : Any> delete(
        path: String,
        bearerToken: String? = null,
    ): R {
        try {
            val httpResponse =
                httpClient.delete("$normalizedBase/$path") {
                    if (!bearerToken.isNullOrBlank()) header(HttpHeaders.Authorization, "Bearer $bearerToken")
                }
            return unwrap(httpResponse.body<ApiEnvelope<R>>())
        } catch (e: AppError) {
            throw e
        } catch (e: ClientRequestException) {
            throw AppError.Api(e.response.status.value, parseMessage(runCatching { e.response.body<JsonObject>() }.getOrNull()))
        } catch (e: ServerResponseException) {
            throw AppError.Server(e.response.status.value)
        } catch (e: Exception) {
            throw AppError.fromException(e)
        }
    }

    suspend inline fun <reified R : Any> submitMultipart(
        path: String,
        fieldName: String,
        fileName: String,
        mimeType: String,
        data: ByteArray,
        bearerToken: String,
    ): R {
        try {
            val httpResponse =
                httpClient.submitFormWithBinaryData(
                    url = "$normalizedBase/$path",
                    formData =
                        formData {
                            append(
                                fieldName,
                                data,
                                Headers.build {
                                    append(HttpHeaders.ContentType, mimeType)
                                    append(HttpHeaders.ContentDisposition, "filename=\"$fileName\"")
                                },
                            )
                        },
                ) {
                    header(HttpHeaders.Authorization, "Bearer $bearerToken")
                }
            return unwrap(httpResponse.body<ApiEnvelope<R>>())
        } catch (e: AppError) {
            throw e
        } catch (e: ClientRequestException) {
            throw AppError.Api(e.response.status.value, parseMessage(runCatching { e.response.body<JsonObject>() }.getOrNull()))
        } catch (e: ServerResponseException) {
            throw AppError.Server(e.response.status.value)
        } catch (e: Exception) {
            throw AppError.fromException(e)
        }
    }

    @PublishedApi internal inline fun <reified R : Any> unwrap(envelope: ApiEnvelope<R>): R =
        envelope.data ?: throw AppError.Api(200, envelope.message ?: "Server returned no data.")

    @PublishedApi internal fun buildUrl(
        path: String,
        params: Map<String, String?>,
    ): String {
        val base = "$normalizedBase/$path"
        val filtered = params.filterValues { !it.isNullOrBlank() }
        if (filtered.isEmpty()) return base
        val query = filtered.entries.joinToString("&") { (k, v) -> "$k=${v!!}" }
        return "$base?$query"
    }

    @PublishedApi internal fun parseMessage(payload: JsonObject?): String =
        payload
            ?.get(
                "message",
            )?.jsonPrimitive
            ?.content ?: "Request failed."

    companion object {
        @OptIn(ExperimentalSerializationApi::class)
        fun buildDefaultClient(): HttpClient {
            val json =
                Json {
                    ignoreUnknownKeys = true
                    explicitNulls = false
                    encodeDefaults = true
                }
            return createPlatformHttpClient {
                    install(ContentNegotiation) { json(json) }
                    install(HttpTimeout) {
                        requestTimeoutMillis = 60_000
                        connectTimeoutMillis = 15_000
                        socketTimeoutMillis = 300_000 // allow time for large media uploads
                    }
                }
        }
    }
}

package com.notwhat.shared.core

/**
 * Sealed domain error hierarchy. All repository and use-case failures map to one of these.
 * UI layers switch on subtypes to produce user-facing messages without leaking HTTP details.
 */
sealed class AppError(message: String) : Exception(message) {

    /** HTTP 4xx from the backend — the request was understood but rejected. */
    data class Api(
        val statusCode: Int,
        val serverMessage: String,
    ) : AppError(serverMessage)

    /** HTTP 5xx or unexpected server-side failure. */
    data class Server(val statusCode: Int) : AppError("Server error ($statusCode). Try again.")

    /** Device has no network connectivity. */
    object NoNetwork : AppError("No internet connection. Check your network and retry.")

    /** Request timed out. */
    object Timeout : AppError("Request timed out. Try again.")

    /** Response body could not be parsed into the expected model. */
    data class Deserialization(val detail: String) : AppError("Unexpected response format: $detail")

    /** An error that doesn't fit the other categories. Avoid using for expected states. */
    data class Unknown(val throwable: Throwable) : AppError(throwable.message ?: "An unexpected error occurred.")

    fun toException(): Exception = this

    companion object {
        fun fromException(e: Exception): AppError = when (e) {
            is AppError -> e
            else -> Unknown(e)
        }
    }

    /** Human-readable message safe to show in UI. */
    fun userMessage(): String = message ?: "Something went wrong."
}

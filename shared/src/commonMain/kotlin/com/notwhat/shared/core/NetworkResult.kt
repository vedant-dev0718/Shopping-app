package com.notwhat.shared.core

/**
 * Typed result wrapper for all network/data operations.
 * Replaces bare exception throwing at repository and use-case boundaries.
 */
sealed class NetworkResult<out T> {
    data class Success<T>(val data: T) : NetworkResult<T>()
    data class Failure(val error: AppError) : NetworkResult<Nothing>()

    val isSuccess: Boolean get() = this is Success
    val isFailure: Boolean get() = this is Failure

    fun getOrNull(): T? = (this as? Success)?.data

    fun getOrThrow(): T = when (this) {
        is Success -> data
        is Failure -> throw error.toException()
    }

    fun <R> map(transform: (T) -> R): NetworkResult<R> = when (this) {
        is Success -> Success(transform(data))
        is Failure -> this
    }

    fun onSuccess(block: (T) -> Unit): NetworkResult<T> {
        if (this is Success) block(data)
        return this
    }

    fun onFailure(block: (AppError) -> Unit): NetworkResult<T> {
        if (this is Failure) block(error)
        return this
    }
}

/** Wraps a suspend block, mapping exceptions to [NetworkResult.Failure]. */
suspend fun <T> runCatchingNetwork(block: suspend () -> T): NetworkResult<T> =
    try {
        NetworkResult.Success(block())
    } catch (e: AppError) {
        NetworkResult.Failure(e)
    } catch (e: Exception) {
        NetworkResult.Failure(AppError.fromException(e))
    }

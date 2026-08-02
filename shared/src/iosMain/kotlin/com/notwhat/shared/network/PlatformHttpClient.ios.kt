package com.notwhat.shared.network

import io.ktor.client.HttpClient
import io.ktor.client.HttpClientConfig
import io.ktor.client.engine.darwin.Darwin

actual fun createPlatformHttpClient(configure: HttpClientConfig<*>.() -> Unit): HttpClient {
    return HttpClient(Darwin, configure)
}

actual fun defaultApiBaseUrl(): String = "http://localhost:5001/api"
package com.notwhat.shared.network

import io.ktor.client.HttpClient
import io.ktor.client.HttpClientConfig

expect fun createPlatformHttpClient(configure: HttpClientConfig<*>.() -> Unit = {}): HttpClient

expect fun defaultApiBaseUrl(): String
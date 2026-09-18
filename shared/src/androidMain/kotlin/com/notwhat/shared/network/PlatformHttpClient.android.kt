package com.notwhat.shared.network

import io.ktor.client.HttpClient
import io.ktor.client.HttpClientConfig
import io.ktor.client.engine.okhttp.OkHttp

actual fun createPlatformHttpClient(configure: HttpClientConfig<*>.() -> Unit): HttpClient {
    return HttpClient(OkHttp, configure)
}

actual fun defaultApiBaseUrl(): String = "http://10.0.2.2:5001/api"
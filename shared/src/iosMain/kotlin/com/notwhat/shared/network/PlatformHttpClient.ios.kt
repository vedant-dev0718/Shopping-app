package com.notwhat.shared.network

import io.ktor.client.HttpClient
import io.ktor.client.HttpClientConfig
import io.ktor.client.engine.darwin.Darwin

actual fun createPlatformHttpClient(configure: HttpClientConfig<*>.() -> Unit): HttpClient =
    HttpClient(Darwin) {
        engine {
            configureSession {
                // Prevent stale keepalive connections from dropping multipart uploads (-1005).
                // Server keepAliveTimeout is 65 s; keep request timeout comfortably below it.
                timeoutIntervalForRequest = 60.0
                timeoutIntervalForResource = 300.0
            }
        }
        configure()
    }

actual fun defaultApiBaseUrl(): String = "http://localhost:5001/api"

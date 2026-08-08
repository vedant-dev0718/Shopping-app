package com.notwhat.shared.network

import io.ktor.client.HttpClient
import io.ktor.client.HttpClientConfig
import io.ktor.client.engine.darwin.Darwin
import platform.Foundation.NSBundle
import platform.Foundation.NSProcessInfo

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

actual fun defaultApiBaseUrl(): String {
    val processInfo = NSProcessInfo.processInfo
    val env = processInfo.environment
    val isSimulator = env["SIMULATOR_UDID"] != null

    val envOverride = (env["NOTWHAT_API_BASE_URL"] as? String)?.trim().orEmpty()
    if (envOverride.isNotBlank()) return envOverride.trimEnd('/')

    val plistOverrideRaw =
        (NSBundle.mainBundle.objectForInfoDictionaryKey("NOTWHAT_API_BASE_URL") as? String)
            ?.trim()
            .orEmpty()
    if (plistOverrideRaw.isNotBlank()) {
        val plistOverride = plistOverrideRaw.trimEnd('/')
        val host =
            plistOverride
                .substringAfter("//", missingDelimiterValue = plistOverride)
                .substringBefore('/')
                .substringBefore(':')
                .lowercase()
        val localhostLike = host == "localhost" || host == "127.0.0.1"
        if (isSimulator || !localhostLike) return plistOverride
    }

    return if (isSimulator) {
        "http://localhost:5001/api"
    } else {
        "http://192.0.0.3:5001/api"
    }
}

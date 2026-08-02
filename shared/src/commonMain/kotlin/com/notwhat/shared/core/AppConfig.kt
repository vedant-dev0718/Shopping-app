package com.notwhat.shared.core

import com.notwhat.shared.config.BackendFlowMode
import com.notwhat.shared.network.defaultApiBaseUrl

/**
 * Injectable application configuration.
 * Replaces passing [BackendFlowMode] as a parameter to every repository method.
 * Create one instance at startup and inject it through [com.notwhat.shared.di.ServiceLocator].
 */
class AppConfig(
    initialBackendMode: BackendFlowMode = BackendFlowMode.MOCK,
    val apiBaseUrl: String = defaultApiBaseUrl(),
) {
    var backendMode: BackendFlowMode = initialBackendMode
        private set

    val isMock: Boolean get() = backendMode == BackendFlowMode.MOCK
    val isLive: Boolean get() = backendMode == BackendFlowMode.LIVE

    fun setBackendMode(mode: BackendFlowMode) {
        backendMode = mode
    }
}

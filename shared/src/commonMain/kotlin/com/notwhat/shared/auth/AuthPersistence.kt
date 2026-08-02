package com.notwhat.shared.auth

import com.notwhat.shared.config.BackendFlowMode
import com.notwhat.shared.session.UserSession
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

expect object AuthPersistenceStore {
    fun readString(key: String): String?
    fun writeString(key: String, value: String)
    fun remove(key: String)
    fun clearAll()
}

class SharedAuthPersistence(
    @OptIn(ExperimentalSerializationApi::class)
    private val json: Json = Json {
        ignoreUnknownKeys = true
        explicitNulls = false
    },
) {
    private object Keys {
        const val backendMode = "shared.auth.backendMode"
        const val currentSession = "shared.auth.currentSession"
    }

    fun loadBackendMode(): BackendFlowMode {
        val rawValue = AuthPersistenceStore.readString(Keys.backendMode)
        return if (rawValue == null) BackendFlowMode.MOCK else BackendFlowMode.fromRawValue(rawValue)
    }

    fun saveBackendMode(mode: BackendFlowMode) {
        AuthPersistenceStore.writeString(Keys.backendMode, mode.rawValue)
    }

    fun loadSession(): UserSession? {
        val raw = AuthPersistenceStore.readString(Keys.currentSession) ?: return null
        return runCatching { json.decodeFromString<UserSession>(raw) }.getOrNull()
    }

    fun saveSession(session: UserSession) {
        AuthPersistenceStore.writeString(Keys.currentSession, json.encodeToString(session))
    }

    fun clearSession() {
        AuthPersistenceStore.remove(Keys.currentSession)
    }
}
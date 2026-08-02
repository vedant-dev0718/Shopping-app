package com.notwhat.shared.auth

import com.liftric.kvault.KVault

actual object AuthPersistenceStore {
    private val vault = KVault(serviceName = "com.notwhat.app.shared.auth")
    private const val backendModeKey = "shared.auth.backendMode"
    private const val currentSessionKey = "shared.auth.currentSession"

    actual fun readString(key: String): String? = runCatching { vault.string(key) }.getOrNull()

    actual fun writeString(key: String, value: String) {
        runCatching { vault.set(key, value) }
    }

    actual fun remove(key: String) {
        runCatching { vault.deleteObject(key) }
    }

    actual fun clearAll() {
        runCatching {
            vault.deleteObject(backendModeKey)
            vault.deleteObject(currentSessionKey)
        }
    }
}
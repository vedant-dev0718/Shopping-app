package com.notwhat.shared.auth

import com.liftric.kvault.KVault

actual object AuthPersistenceStore {
    private val vault = KVault(serviceName = "com.notwhat.app.shared.auth")
    private val fallbackMemory = mutableMapOf<String, String>()
    private const val backendModeKey = "shared.auth.backendMode"
    private const val currentSessionKey = "shared.auth.currentSession"

    actual fun readString(key: String): String? {
        fallbackMemory[key]?.let { return it }
        return runCatching { vault.string(key) }
            .getOrNull()
            ?.also { fallbackMemory[key] = it }
    }

    actual fun writeString(
        key: String,
        value: String,
    ) {
        fallbackMemory[key] = value
        runCatching { vault.set(key, value) }
    }

    actual fun remove(key: String) {
        fallbackMemory.remove(key)
        runCatching { vault.deleteObject(key) }
    }

    actual fun clearAll() {
        fallbackMemory.clear()
        runCatching {
            vault.deleteObject(backendModeKey)
            vault.deleteObject(currentSessionKey)
        }
    }
}

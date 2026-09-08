package com.notwhat.shared.notifications

import com.notwhat.shared.auth.AuthPersistenceStore
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

/** Persists the last-seen order id-to-status map so background sync can diff across app launches. */
internal object OrderSnapshotStore {
    private const val KEY = "shared.notifications.orderSnapshot"
    private val json = Json { ignoreUnknownKeys = true }

    fun load(): Map<String, String> {
        val raw = AuthPersistenceStore.readString(KEY) ?: return emptyMap()
        return runCatching { json.decodeFromString<Map<String, String>>(raw) }.getOrDefault(emptyMap())
    }

    fun save(statusById: Map<String, String>) {
        AuthPersistenceStore.writeString(KEY, json.encodeToString(statusById))
    }
}

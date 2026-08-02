package com.notwhat.shared.auth

import android.content.Context

object AndroidAppContextHolder {
    var appContext: Context? = null
}

actual object AuthPersistenceStore {
    private const val fileName = "shared_auth_store"
    private val inMemory = mutableMapOf<String, String>()

    private val prefs by lazy {
        requireNotNull(AndroidAppContextHolder.appContext).getSharedPreferences(fileName, Context.MODE_PRIVATE)
    }

    private fun hasContext(): Boolean = AndroidAppContextHolder.appContext != null

    actual fun readString(key: String): String? {
        return if (hasContext()) prefs.getString(key, null) else inMemory[key]
    }

    actual fun writeString(key: String, value: String) {
        if (hasContext()) {
            prefs.edit().putString(key, value).apply()
        } else {
            inMemory[key] = value
        }
    }

    actual fun remove(key: String) {
        if (hasContext()) {
            prefs.edit().remove(key).apply()
        } else {
            inMemory.remove(key)
        }
    }

    actual fun clearAll() {
        if (hasContext()) {
            prefs.edit().clear().apply()
        }
        inMemory.clear()
    }
}
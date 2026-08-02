package com.notwhat.shared.config

enum class BackendFlowMode(val rawValue: String) {
    LIVE("live"),
    MOCK("mock");

    companion object {
        fun fromRawValue(rawValue: String?): BackendFlowMode {
            return entries.firstOrNull { it.rawValue.equals(rawValue, ignoreCase = true) } ?: LIVE
        }
    }
}

object BackendFlowModeBridge {
    fun allRawValues(): List<String> = BackendFlowMode.entries.map { it.rawValue }

    fun normalize(rawValue: String?): String = BackendFlowMode.fromRawValue(rawValue).rawValue

    fun isMock(rawValue: String?): Boolean = BackendFlowMode.fromRawValue(rawValue) == BackendFlowMode.MOCK
}
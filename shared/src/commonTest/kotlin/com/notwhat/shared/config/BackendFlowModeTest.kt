package com.notwhat.shared.config

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class BackendFlowModeTest {
    @Test
    fun fromRawValue_defaultsToLive() {
        assertEquals(BackendFlowMode.LIVE, BackendFlowMode.fromRawValue(null))
        assertEquals(BackendFlowMode.LIVE, BackendFlowMode.fromRawValue("unknown"))
    }

    @Test
    fun fromRawValue_isCaseInsensitive() {
        assertEquals(BackendFlowMode.MOCK, BackendFlowMode.fromRawValue("MOCK"))
        assertEquals(BackendFlowMode.LIVE, BackendFlowMode.fromRawValue("live"))
    }

    @Test
    fun bridge_helpers_areStable() {
        assertEquals(listOf("live", "mock"), BackendFlowModeBridge.allRawValues())
        assertEquals("live", BackendFlowModeBridge.normalize("invalid"))
        assertEquals("mock", BackendFlowModeBridge.normalize("mock"))
        assertTrue(BackendFlowModeBridge.isMock("mock"))
        assertFalse(BackendFlowModeBridge.isMock("live"))
    }
}
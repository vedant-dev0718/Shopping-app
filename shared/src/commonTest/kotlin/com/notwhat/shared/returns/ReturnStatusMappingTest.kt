package com.notwhat.shared.returns

import kotlin.test.Test
import kotlin.test.assertEquals

class ReturnStatusMappingTest {
    @Test
    fun mapsKnownRequestedSynonyms() {
        assertEquals(ReturnCanonicalStatus.requested, mapRawReturnStatus("requested"))
        assertEquals(ReturnCanonicalStatus.requested, mapRawReturnStatus("return_requested"))
    }

    @Test
    fun mapsKnownLogisticsSynonyms() {
        assertEquals(ReturnCanonicalStatus.reverse_pickup, mapRawReturnStatus("pickup_scheduled"))
        assertEquals(ReturnCanonicalStatus.in_transit, mapRawReturnStatus("reverse_in_transit"))
        assertEquals(ReturnCanonicalStatus.delivered_to_seller, mapRawReturnStatus("reverse_delivered"))
    }

    @Test
    fun mapsFinancialAndTerminalStates() {
        assertEquals(ReturnCanonicalStatus.refunded, mapRawReturnStatus("refund_processed"))
        assertEquals(ReturnCanonicalStatus.closed, mapRawReturnStatus("resolved"))
    }

    @Test
    fun mapsUnknownValuesToUnknown() {
        assertEquals(ReturnCanonicalStatus.unknown, mapRawReturnStatus("awaiting_manual_review"))
        assertEquals(ReturnCanonicalStatus.unknown, mapRawReturnStatus(null))
    }
}

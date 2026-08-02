package com.notwhat.shared.ui

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class BargainFixturesTest {

    @Test
    fun sanitizeBidInput_keepsDigitsOnly() {
        assertEquals("1239", sanitizeBidInput("12a3-9x"))
        assertEquals("", sanitizeBidInput("bid"))
    }

    @Test
    fun forProduct_returnsKnownScenarioState() {
        val scenario = BargainFixtures.forProduct(PreviewContent.products.first())
        assertTrue(scenario.state in setOf(BargainState.ACTIVE, BargainState.ENDED, BargainState.WON, BargainState.LOST))
        assertTrue(scenario.recentBidEvents.isNotEmpty())
    }

    @Test
    fun forReel_returnsScenarioWithTimeline() {
        val scenario = BargainFixtures.forReel(PreviewContent.reels.first())
        assertTrue(scenario.recentBidEvents.size >= 3)
        assertTrue(scenario.highestBid.isNotBlank())
    }
}

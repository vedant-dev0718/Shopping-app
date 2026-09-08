package com.notwhat.shared.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertTextEquals
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextClearance
import androidx.compose.ui.test.performTextInput
import androidx.compose.ui.unit.dp
import com.notwhat.app.HostComposeTestActivity
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class BidSheetHostUiTest {
    @get:Rule
    val composeRule = createAndroidComposeRule<HostComposeTestActivity>()

    @Test
    fun productDetail_bidSheet_openAndClose() {
        composeRule.setContent {
            ProductBidHarness()
        }

        composeRule.onAllNodesWithTag("product_bid_sheet", useUnmergedTree = true).assertCountEquals(0)
        composeRule.onNodeWithTag("product_offer_card", useUnmergedTree = true).performClick()
        composeRule.onAllNodesWithTag("product_bid_sheet", useUnmergedTree = true).assertCountEquals(1)
        composeRule.onNodeWithTag("product_bid_close", useUnmergedTree = true).performClick()
        composeRule.onAllNodesWithTag("product_bid_sheet", useUnmergedTree = true).assertCountEquals(0)
    }

    @Test
    fun reelDetail_bidSheet_openAndNumericInputOnly() {
        composeRule.setContent {
            ReelBidHarness()
        }

        composeRule.onNodeWithTag("reel_active_bargain_card", useUnmergedTree = true).performClick()
        composeRule.onAllNodesWithTag("reel_bid_sheet", useUnmergedTree = true).assertCountEquals(1)
        composeRule.onNodeWithTag("reel_bid_input", useUnmergedTree = true).performTextClearance()
        composeRule.onNodeWithTag("reel_bid_input", useUnmergedTree = true).performTextInput("12a3-9x")
        composeRule.onNodeWithTag("reel_bid_input", useUnmergedTree = true).assertTextEquals("1239")
    }

    @Test
    fun reelDetail_placeBidButton_opensAndClosesBidSheet() {
        composeRule.setContent {
            ReelBidHarness()
        }

        composeRule.onAllNodesWithTag("reel_bid_sheet", useUnmergedTree = true).assertCountEquals(0)
        composeRule.onNodeWithTag("reel_place_bid_button", useUnmergedTree = true).performClick()
        composeRule.onAllNodesWithTag("reel_bid_sheet", useUnmergedTree = true).assertCountEquals(1)
        composeRule.onNodeWithTag("reel_bid_close", useUnmergedTree = true).performClick()
        composeRule.onAllNodesWithTag("reel_bid_sheet", useUnmergedTree = true).assertCountEquals(0)
    }
}

@androidx.compose.runtime.Composable
private fun ProductBidHarness() {
    val product = PreviewContent.products.first().toProductDtoStub()
    val scenario = BargainFixtures.forProduct(product)
    var showBidSheet by remember { mutableStateOf(false) }
    var bidInput by remember { mutableStateOf(scenario.defaultBidInput) }

    Box {
        MakeOfferCard(
            modifier = Modifier.fillMaxWidth().testTag("product_offer_card"),
            title = scenario.headline,
            subtitle = scenario.subheadline,
            stats = "${scenario.recentBidEvents.size} Bids",
            badge = scenario.state.label,
            textColor = Color.White,
            mutedColor = Color.LightGray,
            accentColor = Color(0xFFB38B6D),
            surfaceColor = Color(0xFF2D1B16),
            chipColor = Color(0xFF382620),
            onClick = { showBidSheet = true },
        )

        BidBottomSheet(
            isVisible = showBidSheet,
            onDismiss = { showBidSheet = false },
            product = product,
            bidInput = bidInput,
            onBidInputChange = { bidInput = it },
            onConfirm = { showBidSheet = false },
            isSubmitting = false,
            highestBidLabel = scenario.headline,
            bidGuidance = scenario.subheadline,
            actionNote = null,
            recentBidLines = scenario.recentBidEvents.map { it.toString() },
            backgroundColor = Color.Black,
            surfaceColor = Color(0xFF2D1B16),
            textColor = Color.White,
            mutedColor = Color.LightGray,
            accentColor = Color(0xFFB38B6D),
            tagPrefix = "product_bid",
        )
    }
}

@androidx.compose.runtime.Composable
private fun ReelBidHarness() {
    val reel = PreviewContent.reels.first()
    val scenario = BargainFixtures.forReel(reel)
    val product =
        DemoProduct(
            name = "${reel.creator} Reel Drop",
            price = reel.price,
            originalPrice = null,
            store = reel.creator,
            category = "Reels",
            imageUrl = reel.imageUrl,
        ).toProductDtoStub()
    var showBidSheet by remember { mutableStateOf(false) }
    var bidInput by remember { mutableStateOf(scenario.defaultBidInput) }

    Box {
        Surface(
            color = Color(0xFF44302A),
            shape = RoundedCornerShape(12.dp),
            modifier =
                Modifier
                    .fillMaxWidth()
                    .testTag("reel_active_bargain_card")
                    .clickable { showBidSheet = true },
        ) {
            Text(scenario.headline)
        }

        Surface(
            color = Color(0xFF6E4638),
            shape = RoundedCornerShape(12.dp),
            modifier =
                Modifier
                    .align(Alignment.BottomCenter)
                    .testTag("reel_place_bid_button")
                    .clickable { showBidSheet = true },
        ) {
            Text("Place Bid")
        }

        BidBottomSheet(
            isVisible = showBidSheet,
            onDismiss = { showBidSheet = false },
            product = product,
            bidInput = bidInput,
            onBidInputChange = { bidInput = it },
            onConfirm = { showBidSheet = false },
            isSubmitting = false,
            highestBidLabel = scenario.headline,
            bidGuidance = scenario.subheadline,
            actionNote = null,
            recentBidLines = scenario.recentBidEvents.map { it.toString() },
            backgroundColor = Color.Black,
            surfaceColor = Color(0xFF2D1B16),
            textColor = Color.White,
            mutedColor = Color.LightGray,
            accentColor = Color(0xFFB38B6D),
            tagPrefix = "reel_bid",
        )
    }
}

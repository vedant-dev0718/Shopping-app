package com.notwhat.shared.ui

import androidx.compose.ui.Modifier
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import com.notwhat.app.HostComposeTestActivity
import com.notwhat.shared.bargain.BargainScheduleDto
import com.notwhat.shared.bargain.BuyerBidDto
import com.notwhat.shared.catalog.ProductDto
import com.notwhat.shared.catalog.StoreCardDto
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class BargainProductsScreenUiTest {
    @get:Rule
    val composeRule = createAndroidComposeRule<HostComposeTestActivity>()

    @Test
    fun acceptedBid_showsPayNowAction() {
        val state = NotWhatAppState()
        val product = sampleBargainProduct(id = "product-accepted")
        val acceptedBid =
            BuyerBidDto(
                id = "bid-accepted",
                productId = product.id,
                product = product,
                amount = 5000.0,
                quantity = 2,
                status = "accepted",
                paymentStatus = "authorized",
                paymentWindowEndsAt = "2026-08-08T11:00:00Z",
                canProceedToPayment = true,
            )

        composeRule.setContent {
            BargainProductsScreen(
                modifier = Modifier,
                state = state,
                onOpenProduct = {},
                onOpenCart = {},
                previewActiveSchedules = emptyList(),
                previewMyBids = listOf(acceptedBid),
                debugNowMs = 1_754_651_200_000L,
            )
        }

        composeRule.onAllNodesWithTag("accepted_bid_pay_now_bid-accepted", useUnmergedTree = true).assertCountEquals(1)
    }

    @Test
    fun activeBargainCard_showsTopTimer() {
        val state = NotWhatAppState()
        val product = sampleBargainProduct(id = "product-timer")
        val schedule =
            BargainScheduleDto(
                id = "schedule-1",
                productId = product.id,
                sellerId = "seller-1",
                startDate = "2026-08-08T09:00:00Z",
                endDate = "2026-08-08T11:00:00Z",
                reservePrice = 0.0,
                status = "active",
            )

        state.content.products = listOf(product)

        composeRule.setContent {
            BargainProductsScreen(
                modifier = Modifier,
                state = state,
                onOpenProduct = {},
                onOpenCart = {},
                previewActiveSchedules = listOf(schedule),
                previewMyBids = emptyList(),
                debugNowMs = 1_754_651_200_000L,
            )
        }

        composeRule.onAllNodesWithTag("bargain_timer_product-timer", useUnmergedTree = true).assertCountEquals(1)
    }
}

private fun sampleBargainProduct(id: String): ProductDto =
    ProductDto(
        id = id,
        title = "Sample Saree",
        description = "Bargain product",
        category = "Sarees",
        region = "Jaipur",
        price = 6000.0,
        stock = 5,
        imageUrls = listOf("https://example.com/saree.jpg"),
        bargainEnabled = true,
        storeId = StoreCardDto(id = "store-1", storeName = "Jaipur Heritage House"),
    )

package com.notwhat.shared.ui

internal enum class BargainState {
    ACTIVE,
    ENDED,
    WON,
    LOST,
}

internal val BargainState.label: String
    get() = when (this) {
        BargainState.ACTIVE -> "BID"
        BargainState.ENDED -> "ENDED"
        BargainState.WON -> "WON"
        BargainState.LOST -> "LOST"
    }

internal data class BargainBidEvent(
    val bidder: String,
    val amount: String,
    val relativeTime: String,
) {
    fun displayLine(): String = "$bidder - $amount - $relativeTime"
}

internal data class BargainScenario(
    val state: BargainState,
    val headline: String,
    val subheadline: String,
    val highestBid: String,
    val minBidIncrement: String,
    val defaultBidInput: String,
    val recentBidEvents: List<BargainBidEvent>,
)

internal object BargainFixtures {
    private val activeScenario = BargainScenario(
        state = BargainState.ACTIVE,
        headline = "Make an Offer",
        subheadline = "Highest bid: INR 12,450 - Ends in 01:12:41",
        highestBid = "INR 12,450",
        minBidIncrement = "INR 500",
        defaultBidInput = "13000",
        recentBidEvents = listOf(
            BargainBidEvent("Rahul K.", "INR 12,450", "2m ago"),
            BargainBidEvent("SneakerHead01", "INR 11,900", "5m ago"),
            BargainBidEvent("Anjali_S", "INR 11,400", "12m ago"),
        ),
    )

    private val endedScenario = BargainScenario(
        state = BargainState.ENDED,
        headline = "Bargain Ended",
        subheadline = "Winning bid was INR 8,999",
        highestBid = "INR 8,999",
        minBidIncrement = "INR 300",
        defaultBidInput = "9200",
        recentBidEvents = listOf(
            BargainBidEvent("Arjun.F", "INR 8,999", "just now"),
            BargainBidEvent("KicksOnly", "INR 8,600", "1m ago"),
            BargainBidEvent("Ritu K.", "INR 8,300", "4m ago"),
        ),
    )

    private val wonScenario = BargainScenario(
        state = BargainState.WON,
        headline = "You Won This Bargain",
        subheadline = "Complete checkout to secure your order",
        highestBid = "INR 2,499",
        minBidIncrement = "INR 200",
        defaultBidInput = "2499",
        recentBidEvents = listOf(
            BargainBidEvent("You", "INR 2,499", "just now"),
            BargainBidEvent("Priya M.", "INR 2,350", "3m ago"),
            BargainBidEvent("UrbanKid", "INR 2,100", "7m ago"),
        ),
    )

    private val lostScenario = BargainScenario(
        state = BargainState.LOST,
        headline = "Bargain Closed",
        subheadline = "Another bidder won this drop",
        highestBid = "INR 4,999",
        minBidIncrement = "INR 250",
        defaultBidInput = "5000",
        recentBidEvents = listOf(
            BargainBidEvent("StreetNova", "INR 4,999", "just now"),
            BargainBidEvent("You", "INR 4,850", "1m ago"),
            BargainBidEvent("AK_Style", "INR 4,700", "2m ago"),
        ),
    )

    fun forProduct(product: DemoProduct): BargainScenario {
        return when {
            product.name.contains("Swift", ignoreCase = true) -> wonScenario
            product.name.contains("Void", ignoreCase = true) -> endedScenario
            product.name.contains("Chrome", ignoreCase = true) -> activeScenario
            else -> lostScenario
        }
    }

    fun forProduct(product: com.notwhat.shared.catalog.ProductDto): BargainScenario {
        return when {
            product.title.contains("Swift", ignoreCase = true) -> wonScenario
            product.title.contains("Void", ignoreCase = true) -> endedScenario
            product.title.contains("Chrome", ignoreCase = true) -> activeScenario
            else -> lostScenario
        }
    }

    fun forReel(reel: DemoReel): BargainScenario {
        return when {
            reel.label.contains("BARGAIN", ignoreCase = true) -> activeScenario
            reel.creator.contains("Urban", ignoreCase = true) -> wonScenario
            reel.creator.contains("Street", ignoreCase = true) -> lostScenario
            else -> endedScenario
        }
    }

    fun forReel(reel: com.notwhat.shared.catalog.ReelDto): BargainScenario {
        return when {
            reel.caption?.contains("bargain", ignoreCase = true) == true -> activeScenario
            reel.storeId?.verified == true -> wonScenario
            reel.viewCount > 2000 -> endedScenario
            else -> lostScenario
        }
    }
}

internal fun sanitizeBidInput(input: String): String = input.filter { it.isDigit() }

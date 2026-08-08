package com.notwhat.shared.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.notwhat.shared.address.AddressDto
import com.notwhat.shared.bargain.BidDto
import com.notwhat.shared.bargain.BidShippingInfoDto
import com.notwhat.shared.bargain.BuyerBidDto
import com.notwhat.shared.catalog.ProductDto
import com.notwhat.shared.catalog.StoreDto
import com.notwhat.shared.catalog.UpdateProductRequestDto
import com.notwhat.shared.core.NetworkResult
import com.notwhat.shared.session.UserRole
import kotlin.math.max
import kotlin.math.round
import kotlin.math.roundToInt
import kotlinx.coroutines.launch

@OptIn(ExperimentalFoundationApi::class)
@Composable
internal fun ProductDetailScreen(
    modifier: Modifier,
    state: NotWhatAppState,
    product: ProductDto,
    onOpenStore: (StoreDto) -> Unit,
    onSellerEdit: ((ProductDto) -> Unit)? = null,
    onSellerRestock: ((ProductDto) -> Unit)? = null,
    onBack: () -> Unit,
) {
    val detailBg = Color(0xFFFAF7F4)
    val detailSurface = Color(0xFFFFFFFF)
    val detailSurfaceHigh = Color(0xFFF2EDE8)
    val detailText = Color(0xFF1A1008)
    val detailMuted = Color(0xFF7A6A5A)
    val detailAccent = NotWhatAuthTokens.accent
    val scope = rememberCoroutineScope()
    val resolvedProduct = state.content.products.firstOrNull { it.id == product.id } ?: product
    val bargainScenario = BargainFixtures.forProduct(resolvedProduct)
    val pricingMeta = resolvedProduct.resolvePricingMeta()

    var selectedSize by remember { mutableStateOf("M") }
    var showBidSheet by remember { mutableStateOf(false) }
    var bidInput by remember(resolvedProduct.id) { mutableStateOf(suggestedBidInput(resolvedProduct.price)) }
    var addedToCart by remember(resolvedProduct.id) { mutableStateOf(false) }
    var isAddingToCart by remember(resolvedProduct.id) { mutableStateOf(false) }
    var cartError by remember(resolvedProduct.id) { mutableStateOf<String?>(null) }
    var selectedQuantity by remember(resolvedProduct.id) { mutableStateOf(1) }
    var sellerActionNote by remember(resolvedProduct.id) { mutableStateOf<String?>(null) }
    var isHidingProduct by remember(resolvedProduct.id) { mutableStateOf(false) }
    val isSellerView = state.uiRole == UserRole.Seller
    var buyerBids by remember(resolvedProduct.id) { mutableStateOf<List<BuyerBidDto>>(emptyList()) }
    var isBuyerBidsLoading by remember(resolvedProduct.id) { mutableStateOf(false) }
    var buyerBidError by remember(resolvedProduct.id) { mutableStateOf<String?>(null) }
    var isPlacingBid by remember(resolvedProduct.id) { mutableStateOf(false) }
    var bidActionNote by remember(resolvedProduct.id) { mutableStateOf<String?>(null) }
    var hasActiveBargainSchedule by remember(resolvedProduct.id) { mutableStateOf<Boolean?>(null) }
    var sellerLiveBids by remember(resolvedProduct.id) { mutableStateOf<List<BidDto>>(emptyList()) }
    var isSellerBidsLoading by remember(resolvedProduct.id) { mutableStateOf(false) }
    var sellerBidsError by remember(resolvedProduct.id) { mutableStateOf<String?>(null) }
    var isAcceptingBid by remember(resolvedProduct.id) { mutableStateOf(false) }
    val resolvedStore =
        state.content.stores.firstOrNull { it.id == resolvedProduct.storeId?.id }
            ?: resolvedProduct.storeId?.let { storeCard ->
                StoreDto(
                    id = storeCard.id,
                    storeName = storeCard.storeName,
                    profileImageUrl = storeCard.profileImageUrl,
                    city = storeCard.city,
                    state = storeCard.state,
                    region = storeCard.region,
                    category = storeCard.category,
                )
            }

    LaunchedEffect(isSellerView, resolvedProduct.id, state.currentSession?.authToken) {
        if (!isSellerView) {
            sellerLiveBids = emptyList()
            sellerBidsError = null
            isSellerBidsLoading = false
            return@LaunchedEffect
        }

        val token = state.currentSession?.authToken

        if (token.isNullOrBlank()) {
            sellerLiveBids = emptyList()
            sellerBidsError = "Sign in again to load live bids."
            isSellerBidsLoading = false
            return@LaunchedEffect
        }

        isSellerBidsLoading = true
        sellerBidsError = null

        when (val result = state.sellerContent.getProductBids(resolvedProduct.id, token)) {
            is com.notwhat.shared.core.NetworkResult.Success -> {
                sellerLiveBids = result.data
                sellerBidsError = null
            }
            is com.notwhat.shared.core.NetworkResult.Failure -> {
                sellerLiveBids = emptyList()
                sellerBidsError = result.error.userMessage()
            }
        }

        isSellerBidsLoading = false
    }

    LaunchedEffect(isSellerView, resolvedProduct.id, state.currentSession?.authToken) {
        if (isSellerView || !resolvedProduct.bargainEnabled) {
            buyerBids = emptyList()
            buyerBidError = null
            isBuyerBidsLoading = false
            return@LaunchedEffect
        }

        val token = state.currentSession?.authToken
        if (token.isNullOrBlank()) {
            buyerBids = emptyList()
            buyerBidError = null
            isBuyerBidsLoading = false
            return@LaunchedEffect
        }

        isBuyerBidsLoading = true
        buyerBidError = null
        when (val result = state.bargainUseCase.getMyBids(token)) {
            is NetworkResult.Success -> {
                buyerBids = result.data
                buyerBidError = null
            }

            is NetworkResult.Failure -> {
                buyerBids = emptyList()
                buyerBidError = result.error.userMessage()
            }
        }
        isBuyerBidsLoading = false
    }

    LaunchedEffect(resolvedProduct.id, resolvedProduct.bargainEnabled) {
        if (!resolvedProduct.bargainEnabled) {
            hasActiveBargainSchedule = null
            return@LaunchedEffect
        }

        when (val result = state.bargainUseCase.getActiveBargains()) {
            is NetworkResult.Success -> {
                hasActiveBargainSchedule = result.data.any { it.productId == resolvedProduct.id }
            }

            is NetworkResult.Failure -> {
                hasActiveBargainSchedule = null
            }
        }
    }

    val acceptedBidForProduct =
        buyerBids.firstOrNull {
            it.productId == resolvedProduct.id && it.canProceedToPayment
        }
    val pendingBidForProduct =
        buyerBids.firstOrNull {
            it.productId == resolvedProduct.id && it.status.lowercase() in setOf("active", "pending_seller_decision")
        }
    val requiresAcceptedBid = !isSellerView && resolvedProduct.bargainEnabled
    val canAddToCart = !requiresAcceptedBid || acceptedBidForProduct != null
    val acceptedQuantity = acceptedBidForProduct?.quantity
    val bidsForProduct = buyerBids.filter { it.productId == resolvedProduct.id }
    val highestBuyerBidForProduct = bidsForProduct.maxByOrNull { it.amount }
    val recentBuyerBidsForProduct = bidsForProduct.sortedByDescending { it.createdAt ?: "" }.take(3)
    val isBargainScheduleClosed = hasActiveBargainSchedule == false
    val bargainCardTitle =
        when {
            acceptedBidForProduct != null -> "Bid Accepted"
            pendingBidForProduct != null -> "Bid Pending"
            isBargainScheduleClosed -> "Bargain Closed"
            resolvedProduct.bargainEnabled -> "Place a Bid"
            else -> bargainScenario.headline
        }
    val bargainCardSubtitle =
        when {
            acceptedBidForProduct != null -> "Proceed to checkout during your payment window"
            pendingBidForProduct != null -> "Seller will review your bid soon"
            isBargainScheduleClosed -> "This product is not accepting new bids right now"
            resolvedProduct.bargainEnabled -> "Submit your offer to unlock checkout"
            else -> bargainScenario.subheadline
        }
    val bargainCardBadge =
        when {
            acceptedBidForProduct != null -> "ACCEPTED"
            pendingBidForProduct != null -> "PENDING"
            isBargainScheduleClosed -> "CLOSED"
            resolvedProduct.bargainEnabled -> "OPEN"
            else -> bargainScenario.state.label
        }
    val bargainCardStats = if (bidsForProduct.isNotEmpty()) "${bidsForProduct.size} Bids" else "No bids yet"

    LaunchedEffect(acceptedQuantity) {
        acceptedQuantity?.let { qty ->
            selectedQuantity = qty.coerceAtLeast(1)
        }
    }

    Box(modifier = modifier.fillMaxSize().background(detailBg)) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 16.dp, bottom = if (isSellerView) 16.dp else 176.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            item {
                Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    TextButton(onClick = onBack) { Text("Back", color = detailAccent) }
                }
            }

            item {
                val imageList = resolvedProduct.imageUrls.ifEmpty { listOf(resolvedProduct.displayImageUrl) }
                val pagerState = rememberPagerState { imageList.size }
                Box(modifier = Modifier.fillMaxWidth().height(360.dp)) {
                    HorizontalPager(
                        state = pagerState,
                        modifier = Modifier.fillMaxSize(),
                    ) { page ->
                        DemoImage(
                            url = imageList[page],
                            contentDescription = resolvedProduct.displayTitle,
                            modifier = Modifier.fillMaxSize(),
                            shape = RoundedCornerShape(16.dp),
                        )
                    }
                    if (imageList.size > 1) {
                        Row(
                            modifier = Modifier.align(Alignment.BottomCenter).padding(8.dp),
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                        ) {
                            repeat(imageList.size) { dot ->
                                Box(
                                    modifier = Modifier
                                        .width(if (dot == pagerState.currentPage) 24.dp else 8.dp)
                                        .height(4.dp)
                                        .background(if (dot == pagerState.currentPage) detailAccent else Color.White.copy(alpha = 0.35f), RoundedCornerShape(4.dp)),
                                )
                            }
                        }
                    }
                }
            }

            item {
                Surface(color = detailSurface, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text(
                            resolvedProduct.displayTitle,
                            style = MaterialTheme.typography.headlineSmall,
                            color = detailText,
                            fontWeight = FontWeight.Bold,
                        )

                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Surface(color = detailSurfaceHigh, shape = RoundedCornerShape(16.dp)) {
                                Text(resolvedProduct.displayStoreName, color = detailText, modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp), style = MaterialTheme.typography.labelMedium)
                            }
                            Text(
                                "Visit Store",
                                color = detailAccent,
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.clickable(enabled = resolvedStore != null) { resolvedStore?.let { onOpenStore(it) } },
                            )
                        }

                        Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(resolvedProduct.displayPrice, color = detailAccent, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black)
                            pricingMeta.originalPrice?.let { originalPrice ->
                                Text(
                                    "₹$originalPrice",
                                    color = detailMuted,
                                    textDecoration = TextDecoration.LineThrough,
                                )
                            }
                            pricingMeta.discountPercent?.let { discount ->
                                Surface(color = Color(0xFFD32F2F), shape = RoundedCornerShape(8.dp)) {
                                    Text(
                                        "$discount% OFF",
                                        color = Color.White,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                        style = MaterialTheme.typography.labelSmall,
                                    )
                                }
                            }
                        }

                        cartError?.let {
                            Text(it, color = Color(0xFFFFC9C9), style = MaterialTheme.typography.bodySmall)
                        }

                        if (!isSellerView && resolvedProduct.bargainEnabled) {
                            val statusMessage =
                                when {
                                    isBuyerBidsLoading -> "Checking your bid status..."
                                    acceptedBidForProduct != null -> "Bid accepted: pay for ${acceptedBidForProduct.quantity} items at ₹${acceptedBidForProduct.amount.toInt()} each."
                                    pendingBidForProduct != null -> "Your bid is pending seller decision. Cart unlocks after acceptance."
                                    isBargainScheduleClosed -> "Bargain is not currently active for this product."
                                    buyerBidError != null -> buyerBidError ?: ""
                                    else -> "Place a bid first. Cart unlocks only after seller accepts your bid."
                                }
                            Text(statusMessage, color = detailMuted, style = MaterialTheme.typography.bodySmall)
                            bidActionNote?.let {
                                Text(it, color = detailMuted, style = MaterialTheme.typography.bodySmall)
                            }
                        }

                        if (isSellerView) {
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                                Button(
                                    onClick = { onSellerEdit?.invoke(resolvedProduct) },
                                    modifier = Modifier.weight(1f),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = detailAccent),
                                    enabled = onSellerEdit != null,
                                ) {
                                    Text("Edit", color = Color.White, fontWeight = FontWeight.Bold)
                                }
                                Button(
                                    onClick = {
                                        val token = state.currentSession?.authToken
                                        if (token.isNullOrBlank()) {
                                            sellerActionNote = "Sign in again to hide this product."
                                            return@Button
                                        }

                                        if (!isHidingProduct) {
                                            scope.launch {
                                                isHidingProduct = true
                                                val result = state.sellerContent.updateProduct(
                                                    id = resolvedProduct.id,
                                                    request = UpdateProductRequestDto(status = "hidden"),
                                                    bearerToken = token,
                                                )
                                                sellerActionNote = if (result is com.notwhat.shared.core.NetworkResult.Success) {
                                                    "Product hidden from storefront."
                                                } else {
                                                    "Could not hide product right now."
                                                }
                                                isHidingProduct = false
                                            }
                                        }
                                    },
                                    modifier = Modifier.weight(1f),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF374151)),
                                    enabled = !isHidingProduct,
                                ) {
                                    Text(if (isHidingProduct) "Hiding..." else "Hide", color = Color.White, fontWeight = FontWeight.Bold)
                                }
                                Button(
                                    onClick = { onSellerRestock?.invoke(resolvedProduct) },
                                    modifier = Modifier.weight(1f),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0EA5A4)),
                                    enabled = onSellerRestock != null,
                                ) {
                                    Text("Restock", color = Color.White, fontWeight = FontWeight.Bold)
                                }
                            }

                            sellerActionNote?.let {
                                Text(it, color = detailMuted, style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                }
            }

            item {
                Surface(color = detailSurface, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("Select Size", color = detailMuted, style = MaterialTheme.typography.labelMedium)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            listOf("S", "M", "L", "XL").forEach { size ->
                                val active = selectedSize == size
                                Surface(
                                    modifier = Modifier.clickable { selectedSize = size },
                                    color = if (active) detailAccent.copy(alpha = 0.2f) else detailSurfaceHigh,
                                    shape = RoundedCornerShape(12.dp),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, if (active) detailAccent else Color(0xFFD4C4B8)),
                                ) {
                                    Text(size, color = if (active) detailAccent else detailText, modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp), fontWeight = FontWeight.Bold)
                                }
                            }
                        }

                    }
                }
            }

            item {
                if (isSellerView) {
                    SellerCurrentBidSection(
                        modifier = Modifier.fillMaxWidth(),
                        bids = sellerLiveBids,
                        isLoading = isSellerBidsLoading,
                        loadError = sellerBidsError,
                        isAcceptingBid = isAcceptingBid,
                        onAcceptHighestBid = { bid ->
                            val token = state.currentSession?.authToken
                            if (token.isNullOrBlank()) {
                                sellerActionNote = "Sign in again to accept bids."
                                return@SellerCurrentBidSection
                            }

                            if (isAcceptingBid) {
                                return@SellerCurrentBidSection
                            }

                            scope.launch {
                                isAcceptingBid = true
                                sellerActionNote = null

                                when (val result = state.sellerContent.acceptBid(resolvedProduct.id, bid.id, token)) {
                                    is NetworkResult.Success -> {
                                        sellerActionNote = "Bid accepted. Buyer can proceed with payment window."
                                        when (val refreshed = state.sellerContent.getProductBids(resolvedProduct.id, token)) {
                                            is NetworkResult.Success -> {
                                                sellerLiveBids = refreshed.data
                                                sellerBidsError = null
                                            }

                                            is NetworkResult.Failure -> {
                                                sellerBidsError = refreshed.error.userMessage()
                                            }
                                        }
                                    }

                                    is NetworkResult.Failure -> {
                                        sellerActionNote = result.error.userMessage()
                                    }
                                }

                                isAcceptingBid = false
                            }
                        },
                        textColor = detailText,
                        mutedColor = detailMuted,
                        accentColor = detailAccent,
                        surfaceColor = detailSurface,
                        chipColor = detailSurfaceHigh,
                    )
                } else {
                    MakeOfferCard(
                        modifier = Modifier.fillMaxWidth().testTag("product_offer_card"),
                        title = bargainCardTitle,
                        subtitle = bargainCardSubtitle,
                        stats = bargainCardStats,
                        badge = bargainCardBadge,
                        textColor = detailText,
                        mutedColor = detailMuted,
                        accentColor = detailAccent,
                        surfaceColor = detailSurface,
                        chipColor = detailSurfaceHigh,
                        onClick = {
                            if (isBargainScheduleClosed) {
                                bidActionNote = "Bargain is not currently active for this product."
                            } else {
                                showBidSheet = true
                            }
                        },
                    )
                }
            }

            item {
                Surface(color = detailSurface, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Description & Features", color = detailText, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                        Text(
                            resolvedProduct.description.ifBlank {
                                "Heavyweight cotton, puff print details, and distressed ribbing built for an urban fit. Machine wash cold, hang dry."
                            },
                            color = detailMuted,
                        )
                    }
                }
            }
        }

        if (!isSellerView) {
            Surface(modifier = Modifier.align(Alignment.BottomCenter).fillMaxWidth(), color = detailBg.copy(alpha = 0.94f)) {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Total", color = detailMuted, style = MaterialTheme.typography.labelSmall)
                            Text(resolvedProduct.displayPrice, color = detailText, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        }
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier.background(detailSurface, RoundedCornerShape(14.dp)).padding(horizontal = 10.dp, vertical = 8.dp)
                        ) {
                            Text("Qty", color = detailMuted, style = MaterialTheme.typography.labelSmall)
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(vertical = 4.dp)
                            ) {
                                Surface(
                                    shape = RoundedCornerShape(10.dp),
                                    color = detailSurfaceHigh,
                                    modifier = Modifier.size(34.dp).clickable(enabled = acceptedQuantity == null) {
                                        if (selectedQuantity > 1) selectedQuantity--
                                    },
                                ) {
                                    Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                        Text("-", color = detailText, fontWeight = FontWeight.Bold)
                                    }
                                }
                                Surface(
                                    shape = RoundedCornerShape(10.dp),
                                    color = Color.White,
                                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFD4C4B8)),
                                ) {
                                    Text(
                                        selectedQuantity.toString(),
                                        color = detailText,
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                                    )
                                }
                                Surface(
                                    shape = RoundedCornerShape(10.dp),
                                    color = detailAccent,
                                    modifier = Modifier.size(34.dp).clickable(enabled = acceptedQuantity == null) {
                                        val maxAllowed = acceptedQuantity ?: 10
                                        if (selectedQuantity < maxAllowed) selectedQuantity++
                                    },
                                ) {
                                    Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                        Text("+", color = Color.White, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                    Button(
                        onClick = {
                            if (!addedToCart && !isAddingToCart && canAddToCart) {
                                val token = state.currentSession?.authToken
                                if (token.isNullOrBlank()) {
                                    cartError = "Please sign in to add items to cart."
                                } else {
                                    scope.launch {
                                        isAddingToCart = true
                                        cartError = null
                                        val quantityToAdd = acceptedBidForProduct?.quantity ?: selectedQuantity
                                        val result = state.transaction.addCartItem(
                                            productId = resolvedProduct.id,
                                            quantity = quantityToAdd,
                                            bargainBidId = acceptedBidForProduct?.id,
                                            bearerToken = token,
                                        )
                                        if (result is com.notwhat.shared.core.NetworkResult.Success) {
                                            addedToCart = true
                                            state.transaction.refreshCart(token)
                                        } else if (result is com.notwhat.shared.core.NetworkResult.Failure) {
                                            cartError = result.error.userMessage()
                                        }
                                        isAddingToCart = false
                                    }
                                }
                            }
                        },
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = if (addedToCart) Color(0xFF388E3C) else detailAccent),
                        enabled = !isAddingToCart && canAddToCart,
                    ) {
                        Text(
                            when {
                                isAddingToCart -> "Adding..."
                                !canAddToCart -> "BID ACCEPTANCE REQUIRED"
                                acceptedBidForProduct != null && !addedToCart -> "PAY ACCEPTED BID"
                                addedToCart -> "✓ ADDED TO CART"
                                else -> "ADD TO CART"
                            },
                            color = Color.White,
                            fontWeight = FontWeight.Black,
                        )
                    }
                }
            }
        }

        if (!isSellerView) {
            BidBottomSheet(
                isVisible = showBidSheet,
                onDismiss = { showBidSheet = false },
                product = resolvedProduct,
                bidInput = bidInput,
                onBidInputChange = { bidInput = it },
                onConfirm = {
                    if (isBargainScheduleClosed) {
                        bidActionNote = "Bargain is not currently active for this product."
                        return@BidBottomSheet
                    }

                    val token = state.currentSession?.authToken
                    if (token.isNullOrBlank()) {
                        bidActionNote = "Sign in again to place bid."
                        return@BidBottomSheet
                    }

                    val amount = bidInput.toDoubleOrNull()
                    if (amount == null || amount <= 0.0) {
                        bidActionNote = "Enter a valid bid price."
                        return@BidBottomSheet
                    }

                    if (amount >= resolvedProduct.price) {
                        bidActionNote = "Bid price must be below listed product price."
                        return@BidBottomSheet
                    }

                    if (isPlacingBid) {
                        return@BidBottomSheet
                    }

                    scope.launch {
                        isPlacingBid = true
                        bidActionNote = null

                        state.transaction.loadAddresses(token)
                        val shippingAddress = selectPreferredAddress(state.transaction.addresses, state.transaction.selectedDeliveryAddressId)
                        if (shippingAddress == null) {
                            bidActionNote = "Add a delivery address in profile before placing a bid."
                            isPlacingBid = false
                            return@launch
                        }

                        val shippingInfo = shippingAddress.toBidShippingInfo(state.currentSession?.email.orEmpty())
                        val result = state.bargainUseCase.placeBid(
                            productId = resolvedProduct.id,
                            amount = amount,
                            quantity = selectedQuantity,
                            shippingInfo = shippingInfo,
                            bearerToken = token,
                        )

                        when (result) {
                            is NetworkResult.Success -> {
                                bidActionNote = "Bid submitted. Seller decision pending."
                                showBidSheet = false
                                when (val bidsResult = state.bargainUseCase.getMyBids(token)) {
                                    is NetworkResult.Success -> {
                                        buyerBids = bidsResult.data
                                        buyerBidError = null
                                    }

                                    is NetworkResult.Failure -> {
                                        buyerBidError = bidsResult.error.userMessage()
                                    }
                                }
                            }

                            is NetworkResult.Failure -> {
                                bidActionNote = result.error.userMessage()
                            }
                        }

                        isPlacingBid = false
                    }
                },
                isSubmitting = isPlacingBid,
                highestBidLabel = highestBuyerBidForProduct?.amount?.toSellerRupeeLabel() ?: "No bids yet",
                bidGuidance = "Bid amount must be lower than listed product price.",
                recentBidLines =
                    if (recentBuyerBidsForProduct.isNotEmpty()) {
                        recentBuyerBidsForProduct.map { bid ->
                            "You - ${bid.amount.toSellerRupeeLabel()} - ${bid.createdAt.toSellerTimeLabel()}"
                        }
                    } else {
                        listOf("No previous bids from your account yet")
                    },
                backgroundColor = detailBg,
                surfaceColor = detailSurface,
                textColor = detailText,
                mutedColor = detailMuted,
                accentColor = detailAccent,
                tagPrefix = "product_bid",
            )
        }
    }
}

@Composable
internal fun SellerCurrentBidSection(
    modifier: Modifier = Modifier,
    bids: List<BidDto>,
    isLoading: Boolean,
    loadError: String?,
    isAcceptingBid: Boolean,
    onAcceptHighestBid: (BidDto) -> Unit,
    textColor: Color,
    mutedColor: Color,
    accentColor: Color,
    surfaceColor: Color,
    chipColor: Color,
) {
    val highestBid = bids.maxByOrNull { it.amount }
    val highestPendingBid = bids.filter { it.status in setOf("active", "pending_seller_decision") }.maxByOrNull { it.amount }
    val latestBids = bids
        .sortedByDescending { it.createdAt ?: "" }
        .take(3)
    val statusLabel = highestBid
        ?.status
        ?.replace('_', ' ')
        ?.replaceFirstChar { it.uppercaseChar() }
        ?: if (isLoading) "LOADING" else "NO BIDS"

    Surface(color = surfaceColor, shape = RoundedCornerShape(16.dp), modifier = modifier) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Current Bid", color = textColor, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                Surface(color = chipColor, shape = RoundedCornerShape(8.dp)) {
                    Text(statusLabel, color = textColor, modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp), style = MaterialTheme.typography.labelSmall)
                }
            }

            Text(
                highestBid?.amount?.toSellerRupeeLabel() ?: "No bids yet",
                color = accentColor,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Black,
            )

            highestPendingBid?.let { bid ->
                Button(
                    onClick = { onAcceptHighestBid(bid) },
                    modifier = Modifier.fillMaxWidth().height(44.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = accentColor),
                    enabled = !isAcceptingBid,
                ) {
                    Text(
                        if (isAcceptingBid) "ACCEPTING..." else "ACCEPT HIGHEST BID",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }

            if (isLoading) {
                Text("Loading live bid data...", color = mutedColor, style = MaterialTheme.typography.bodySmall)
            }

            loadError?.takeIf { it.isNotBlank() }?.let {
                Text("Live bids unavailable: $it", color = mutedColor, style = MaterialTheme.typography.bodySmall)
            }

            Text("${bids.size} total bids", color = mutedColor, style = MaterialTheme.typography.labelSmall)

            if (latestBids.isNotEmpty()) {
                Text("Bid Trend", color = textColor, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    latestBids.forEach { bid ->
                        Surface(color = chipColor, shape = RoundedCornerShape(10.dp), modifier = Modifier.weight(1f)) {
                            Column(modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Text(bid.amount.toSellerRupeeLabel(), color = textColor, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                                Text(bid.createdAt.toSellerTimeLabel(), color = mutedColor, style = MaterialTheme.typography.labelSmall)
                            }
                        }
                    }
                }
            }
        }
    }
}

private fun Double.toSellerRupeeLabel(): String {
    val rounded = kotlin.math.round(this * 100.0) / 100.0
    val isWhole = kotlin.math.abs(rounded - rounded.toInt()) < 0.0001
    return if (isWhole) "₹${rounded.toInt()}" else "₹$rounded"
}

private fun String?.toSellerTimeLabel(): String {
    val value = this ?: return "--"
    if (value.length >= 16 && value[10] == 'T') {
        return value.substring(11, 16)
    }
    return value.take(16)
}

private data class PricingMeta(
    val originalPrice: Int? = null,
    val discountPercent: Int? = null,
)

private fun ProductDto.resolvePricingMeta(): PricingMeta {
    val currentPrice = price.takeIf { it > 0 } ?: return PricingMeta()

    val explicitOriginal = originalPrice?.takeIf { it > currentPrice }?.roundToInt()
    val explicitDiscount = discountPercent?.coerceIn(1.0, 99.0)?.roundToInt()

    if (explicitOriginal != null || explicitDiscount != null) {
        val resolvedOriginal =
            explicitOriginal
                ?: explicitDiscount?.let { pct -> (currentPrice / (1 - (pct / 100.0))).roundToInt() }
        val resolvedDiscount =
            explicitDiscount
                ?: resolvedOriginal?.let { original ->
                    (((original - currentPrice) / original) * 100.0).roundToInt().coerceIn(1, 99)
                }
        return PricingMeta(originalPrice = resolvedOriginal, discountPercent = resolvedDiscount)
    }

    val originalFromTags =
        tags.firstNotNullOfOrNull { tag ->
            parseNumericTag(tag, keys = listOf("mrp", "original", "original_price", "list", "list_price", "compare_at"))
        }
    val discountFromTags =
        tags.firstNotNullOfOrNull { tag ->
            parseNumericTag(tag, keys = listOf("discount", "off", "discount_percent"))
        }

    val normalizedDiscount = discountFromTags?.coerceIn(1.0, 99.0)
    val resolvedOriginal =
        when {
            originalFromTags != null && originalFromTags > currentPrice -> originalFromTags.roundToInt()
            normalizedDiscount != null -> (currentPrice / (1 - (normalizedDiscount / 100.0))).roundToInt()
            else -> null
        }

    val resolvedDiscount =
        when {
            normalizedDiscount != null -> normalizedDiscount.roundToInt()
            resolvedOriginal != null && resolvedOriginal > currentPrice ->
                (((resolvedOriginal - currentPrice) / resolvedOriginal) * 100.0).roundToInt().coerceIn(1, 99)
            else -> null
        }

    return PricingMeta(originalPrice = resolvedOriginal, discountPercent = resolvedDiscount)
}

private fun parseNumericTag(
    tag: String,
    keys: List<String>,
): Double? {
    val normalized = tag.trim().lowercase()
    val key = keys.firstOrNull { candidate ->
        normalized.startsWith("$candidate:") || normalized.startsWith("$candidate=")
    } ?: return null

    val rawValue = normalized.removePrefix("$key:").removePrefix("$key=").trim().removeSuffix("%")
    return rawValue.toDoubleOrNull()
}

@Composable
internal fun MakeOfferCard(
    modifier: Modifier = Modifier,
    title: String,
    subtitle: String,
    stats: String,
    badge: String,
    textColor: Color,
    mutedColor: Color,
    accentColor: Color,
    surfaceColor: Color,
    chipColor: Color,
    onClick: () -> Unit,
) {
    Surface(color = surfaceColor, shape = RoundedCornerShape(16.dp), modifier = modifier.clickable(onClick = onClick)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(title, color = textColor, fontWeight = FontWeight.Bold)
                Text(subtitle, color = mutedColor, style = MaterialTheme.typography.bodySmall)
            }
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(stats, color = accentColor, style = MaterialTheme.typography.labelMedium)
                Surface(color = chipColor, shape = RoundedCornerShape(8.dp)) {
                    Text(badge, color = textColor, modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp), style = MaterialTheme.typography.labelSmall)
                }
            }
        }
    }
}

@Composable
internal fun BoxScope.BidBottomSheet(
    isVisible: Boolean,
    onDismiss: () -> Unit,
    product: ProductDto,
    bidInput: String,
    onBidInputChange: (String) -> Unit,
    onConfirm: () -> Unit,
    isSubmitting: Boolean,
    highestBidLabel: String,
    bidGuidance: String,
    recentBidLines: List<String>,
    backgroundColor: Color,
    surfaceColor: Color,
    textColor: Color,
    mutedColor: Color,
    accentColor: Color,
    tagPrefix: String,
) {
    if (!isVisible) return

    Box(modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.68f)).clickable { onDismiss() })

    Surface(
        modifier = Modifier.align(Alignment.BottomCenter).fillMaxWidth().height(520.dp).testTag("${tagPrefix}_sheet"),
        color = backgroundColor.copy(alpha = 0.98f),
        shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
    ) {
        Column(modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Place Bid", color = textColor, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                TextButton(onClick = onDismiss, modifier = Modifier.testTag("${tagPrefix}_close")) { Text("Close", color = accentColor) }
            }

            Surface(color = surfaceColor, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                Row(modifier = Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    DemoImage(url = product.displayImageUrl, contentDescription = product.displayTitle, modifier = Modifier.size(72.dp), shape = RoundedCornerShape(12.dp))
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(product.displayTitle, color = textColor, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text("Your Highest Bid: $highestBidLabel", color = accentColor, fontWeight = FontWeight.Bold)
                    }
                }
            }

            OutlinedTextField(
                value = bidInput,
                onValueChange = { typedValue -> onBidInputChange(sanitizeBidInput(typedValue)) },
                modifier = Modifier.fillMaxWidth().testTag("${tagPrefix}_input"),
                label = { Text("Place Your Bid") },
                prefix = { Text("₹", color = accentColor, fontWeight = FontWeight.Bold) },
                placeholder = { Text("13000") },
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = surfaceColor,
                    unfocusedContainerColor = surfaceColor,
                    focusedBorderColor = accentColor,
                    unfocusedBorderColor = Color(0xFFD4C4B8),
                    focusedLabelColor = accentColor,
                    unfocusedLabelColor = mutedColor,
                    focusedTextColor = textColor,
                    unfocusedTextColor = textColor,
                ),
                shape = RoundedCornerShape(16.dp),
            )

            Text(bidGuidance, color = mutedColor, style = MaterialTheme.typography.bodySmall)
            Text("Your Recent Bids", color = textColor, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                recentBidLines.forEach { bid ->
                    Surface(color = surfaceColor, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                        Text(bid, color = mutedColor, modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp))
                    }
                }
            }

            Spacer(modifier = Modifier.weight(1f))
            Button(
                onClick = onConfirm,
                modifier = Modifier.fillMaxWidth().height(52.dp).testTag("${tagPrefix}_confirm"),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = accentColor),
                enabled = !isSubmitting,
            ) {
                Text(if (isSubmitting) "SUBMITTING..." else "CONFIRM BID", color = Color.White, fontWeight = FontWeight.Black)
            }
        }
    }
}

private fun suggestedBidInput(price: Double): String {
    if (price <= 1.0) {
        return "1"
    }
    val suggested = max(1, round(price * 0.9).toInt())
    val maxAllowed = max(1, round(price - 1.0).toInt())
    return minOf(suggested, maxAllowed).toString()
}

private fun selectPreferredAddress(
    addresses: List<AddressDto>,
    selectedAddressId: String?,
): AddressDto? {
    if (!selectedAddressId.isNullOrBlank()) {
        addresses.firstOrNull { it.id == selectedAddressId }?.let { return it }
    }
    return addresses.firstOrNull { it.isDefault } ?: addresses.firstOrNull()
}

private fun AddressDto.toBidShippingInfo(email: String): BidShippingInfoDto =
    BidShippingInfoDto(
        name = fullName,
        email = email,
        phone = phone,
        address = listOfNotNull(addressLine1, addressLine2).joinToString(", "),
        city = city,
        state = state,
        postalCode = pincode,
    )

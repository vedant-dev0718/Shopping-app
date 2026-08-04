package com.notwhat.shared.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.notwhat.shared.checkout.CheckoutPaymentMethod
import com.notwhat.shared.checkout.PaymentBridgeResult
import com.notwhat.shared.checkout.PlatformPaymentBridge
import com.notwhat.shared.checkout.RazorpayCheckoutPayload
import com.notwhat.shared.checkout.defaultMaskedText
import com.notwhat.shared.checkout.defaultSubtitle
import com.notwhat.shared.checkout.displayLabel
import com.notwhat.shared.core.NetworkResult
import kotlinx.coroutines.launch
import kotlin.time.Duration.Companion.seconds
import kotlin.time.TimeMark
import kotlin.time.TimeSource

@Composable
internal fun CheckoutConfirmationScreen(
    modifier: Modifier,
    state: NotWhatAppState,
    draft: CheckoutDraft,
    onBack: () -> Unit,
    onPlaceOrder: (CheckoutOrderSummary) -> Unit,
) {
    val bg = NotWhatColors.background
    val surface = NotWhatColors.surface
    val text = NotWhatColors.onSurface
    val muted = NotWhatColors.onSurfaceVariant
    val accent = NotWhatAuthTokens.accent
    val scope = rememberCoroutineScope()

    val requiresOnlineVerification = draft.selectedPayment.method != CheckoutPaymentMethod.COD
    var submitError by remember { mutableStateOf<String?>(null) }

    Box(modifier = modifier.fillMaxSize().background(bg)) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 96.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    TextButton(onClick = onBack) { Text("Back", color = accent) }
                    Text("Checkout", color = text, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                    Text("Step 1/1", color = muted, style = MaterialTheme.typography.labelMedium)
                }
            }

            item {
                Surface(color = surface, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Deliver To", color = text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text(draft.shippingAddress, color = muted)
                    }
                }
            }

            item {
                Surface(color = surface, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Payment Method", color = text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text(draft.selectedPayment.titleLine(), color = text, fontWeight = FontWeight.SemiBold)
                        Text(draft.selectedPayment.holderName, color = muted)

                        if (requiresOnlineVerification) {
                            HorizontalDivider(color = Color.White.copy(alpha = 0.12f))
                            Text(
                                "Online Payment",
                                color = text,
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = FontWeight.Bold,
                            )
                            Text(
                                "Razorpay checkout opens automatically and callback verification is submitted from SDK response.",
                                color = muted,
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }
                    }
                }
            }

            submitError?.let { message ->
                item {
                    Surface(
                        color = NotWhatColors.surfaceContainerHigh,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(message, color = text, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(12.dp))
                    }
                }
            }

            item {
                Surface(color = surface, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text("Order Items", color = text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        draft.items.forEach { item ->
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("${item.product.name} x${item.quantity}", color = muted)
                                Text(item.product.price, color = text)
                            }
                        }
                        HorizontalDivider(color = Color.White.copy(alpha = 0.12f))
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Subtotal", color = muted)
                            Text(draft.subtotal, color = text)
                        }
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Shipping", color = muted)
                            Text(draft.shipping, color = text)
                        }
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Total", color = text, fontWeight = FontWeight.Bold)
                            Text(draft.total, color = accent, fontWeight = FontWeight.Black)
                        }
                    }
                }
            }
        }

        Surface(modifier = Modifier.align(Alignment.BottomCenter).fillMaxWidth(), color = bg.copy(alpha = 0.96f)) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column {
                    Text("Pay", color = muted, style = MaterialTheme.typography.labelSmall)
                    Text(draft.total, color = text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                }
                Button(
                    onClick = {
                        submitError = null
                        scope.launch {
                            if (requiresOnlineVerification) {
                                val sessionResult = state.startOnlineCheckoutSession()
                                when (sessionResult) {
                                    is NetworkResult.Success -> {
                                        if (!PlatformPaymentBridge.isRazorpayAvailable()) {
                                            submitError = "Razorpay SDK bridge is unavailable. Please contact support."
                                            return@launch
                                        }

                                        val session = sessionResult.data
                                        when (
                                            val paymentResult =
                                                PlatformPaymentBridge.launchRazorpay(
                                                    RazorpayCheckoutPayload(
                                                        keyId = session.razorpayKeyId,
                                                        orderId = session.razorpayOrderId,
                                                        amount = session.razorpayOrderAmount,
                                                        currency = session.currency,
                                                        merchantName = "NotWhat",
                                                        checkoutDescription = "Marketplace order payment",
                                                        prefillEmail = state.currentSession?.email,
                                                        prefillPhone =
                                                            state.transaction.addresses
                                                                .firstOrNull { it.isDefault }
                                                                ?.phone,
                                                    ),
                                                )
                                        ) {
                                            is PaymentBridgeResult.Success -> {
                                                when (
                                                    val verifyResult =
                                                        state.submitCheckoutOrder(
                                                            draft = draft,
                                                            razorpayOrderId = paymentResult.razorpayOrderId,
                                                            razorpayPaymentId = paymentResult.razorpayPaymentId,
                                                            razorpaySignature = paymentResult.razorpaySignature,
                                                        )
                                                ) {
                                                    is NetworkResult.Success -> onPlaceOrder(verifyResult.data)
                                                    is NetworkResult.Failure -> submitError = verifyResult.error.userMessage()
                                                }
                                            }

                                            is PaymentBridgeResult.Failure -> {
                                                submitError = paymentResult.message
                                            }

                                            PaymentBridgeResult.Cancelled -> {
                                                submitError = "Payment cancelled. No amount was charged."
                                            }
                                        }
                                    }

                                    is NetworkResult.Failure -> {
                                        submitError = sessionResult.error.userMessage()
                                    }
                                }
                            } else {
                                when (
                                    val result =
                                        state.submitCheckoutOrder(
                                            draft = draft,
                                            razorpayOrderId = "",
                                            razorpayPaymentId = "",
                                            razorpaySignature = "",
                                        )
                                ) {
                                    is NetworkResult.Success -> onPlaceOrder(result.data)
                                    is NetworkResult.Failure -> submitError = result.error.userMessage()
                                }
                            }
                        }
                    },
                    modifier = Modifier.weight(1f).height(52.dp),
                    shape = RoundedCornerShape(16.dp),
                    enabled = !state.isCheckoutSubmitting,
                    colors = ButtonDefaults.buttonColors(containerColor = accent),
                ) {
                    Text(
                        if (state.isCheckoutSubmitting) "PLACING..." else "PLACE ORDER",
                        color = Color.White,
                        fontWeight = FontWeight.Black,
                    )
                }
            }
        }
    }
}

@Composable
internal fun CheckoutSummaryHandoffScreen(
    modifier: Modifier,
    summary: CheckoutOrderSummary,
    onDone: () -> Unit,
    onOpenProduct: (com.notwhat.shared.catalog.ProductDto) -> Unit,
) {
    val bg = NotWhatColors.background
    val surface = NotWhatColors.surface
    val text = NotWhatColors.onSurface
    val muted = NotWhatColors.onSurfaceVariant
    val accent = NotWhatAuthTokens.accent

    LazyColumn(
        modifier = modifier.fillMaxSize().background(bg),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Surface(color = surface, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Order Placed", color = text, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black)
                    Text("Order ID: ${summary.orderId}", color = accent, fontWeight = FontWeight.Bold)
                    if (summary.orderNumber.isNotBlank()) {
                        Text("Order Number: ${summary.orderNumber}", color = muted)
                    }
                    Text(
                        "Status: ${summary.orderStatus} • Payment: ${summary.paymentStatus}",
                        color = muted,
                        style = MaterialTheme.typography.bodySmall,
                    )
                    Text("Estimated Delivery: ${summary.estimatedDelivery}", color = muted)
                }
            }
        }

        item {
            Surface(color = surface, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        "Order Tracking Timeline",
                        color = text,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                    )
                    summary.trackingSteps.forEachIndexed { index, step ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            verticalAlignment = Alignment.Top,
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Box(
                                    modifier =
                                        Modifier
                                            .size(12.dp)
                                            .clip(RoundedCornerShape(6.dp))
                                            .background(if (step.isComplete) accent else Color.White.copy(alpha = 0.24f)),
                                )
                                if (index != summary.trackingSteps.lastIndex) {
                                    Box(
                                        modifier =
                                            Modifier
                                                .width(2.dp)
                                                .height(30.dp)
                                                .background(Color.White.copy(alpha = 0.16f)),
                                    )
                                }
                            }
                            Column(verticalArrangement = Arrangement.spacedBy(2.dp), modifier = Modifier.weight(1f)) {
                                Text(step.title, color = text, fontWeight = FontWeight.Bold)
                                Text(step.detail, color = muted, style = MaterialTheme.typography.bodySmall)
                                Text(
                                    step.timestamp,
                                    color = if (step.isComplete) accent else muted,
                                    style = MaterialTheme.typography.labelSmall,
                                )
                            }
                        }
                    }
                }
            }
        }

        item {
            Surface(color = surface, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Order Details", color = text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text("Shipping: ${summary.shippingAddress}", color = muted)
                    Text("Payment: ${summary.payment.titleLine()}", color = muted)
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Subtotal", color = muted)
                        Text(summary.subtotal, color = text)
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Shipping", color = muted)
                        Text(summary.shipping, color = text)
                    }
                    HorizontalDivider(color = Color.White.copy(alpha = 0.12f))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Total", color = text, fontWeight = FontWeight.Bold)
                        Text(summary.total, color = accent, fontWeight = FontWeight.Black)
                    }
                }
            }
        }

        items(summary.items) { item ->
            Surface(
                modifier = Modifier.fillMaxWidth().clickable { onOpenProduct(item.product.toProductDtoStub()) },
                color = surface,
                shape = RoundedCornerShape(14.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("${item.product.name} x${item.quantity}", color = text)
                    Text(item.product.price, color = accent)
                }
            }
        }

        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                Button(
                    onClick = {},
                    modifier = Modifier.weight(1f).height(52.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = NotWhatColors.surfaceContainerHigh),
                ) {
                    Text("TRACK PACKAGE", color = text, fontWeight = FontWeight.Bold)
                }
                Button(
                    onClick = onDone,
                    modifier = Modifier.weight(1f).height(52.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = accent),
                ) {
                    Text("CONTINUE SHOPPING", color = Color.White, fontWeight = FontWeight.Black)
                }
            }
        }
    }
}

@Composable
internal fun CartSavedPaymentsScreen(
    modifier: Modifier,
    state: NotWhatAppState,
    onBack: () -> Unit,
    onOpenProduct: (com.notwhat.shared.catalog.ProductDto) -> Unit,
    onProceedToCheckout: (CheckoutDraft) -> Unit,
) {
    val cartBg = NotWhatColors.background
    val cartSurface = NotWhatColors.surface
    val cartSurfaceHigh = NotWhatColors.surfaceContainerHigh
    val cartText = NotWhatColors.onSurface
    val cartMuted = NotWhatColors.onSurfaceVariant
    val cartAccent = NotWhatAuthTokens.accent

    val cart = state.transaction.cart
    val isCartLoading = state.transaction.isCartLoading
    val cartErrorMessage = state.transaction.cartErrorMessage
    val scope = rememberCoroutineScope()
    val sessionToken = state.authState.currentSession?.authToken

    if (cart == null) {
        Box(modifier = modifier.fillMaxSize().background(cartBg)) {
            Column(
                modifier = Modifier.fillMaxSize().padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    TextButton(onClick = onBack) { Text("Back", color = cartAccent) }
                    Text("Cart", color = cartText, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                    Text("0 items", color = cartMuted, style = MaterialTheme.typography.labelMedium)
                }

                Surface(color = cartSurface, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        if (isCartLoading) {
                            CircularProgressIndicator(color = cartAccent)
                            Text("Loading your cart...", color = cartMuted)
                        } else {
                            Text("Unable to load cart", color = cartText, fontWeight = FontWeight.Bold)
                            Text(cartErrorMessage ?: "Please retry.", color = cartMuted)
                            Button(
                                onClick = {
                                    val token = sessionToken ?: return@Button
                                    scope.launch { state.transaction.loadCart(token) }
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = cartAccent),
                                shape = RoundedCornerShape(12.dp),
                            ) {
                                Text("RETRY", color = Color.White, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
        return
    }

    val cartItems = cart.items
    val subtotal = "₹${cart.subtotal.toInt()}"
    val shipping = if (cart.shipping > 0) "₹${cart.shipping.toInt()}" else "Free"
    val total = "₹${cart.finalTotal.toInt()}"
    val shippingAddress =
        state.transaction.addresses
            .firstOrNull { it.isDefault }
            ?.let { "${it.addressLine1}, ${it.city}, ${it.state} ${it.pincode}" }
            ?: "Add a delivery address"

    var paymentMethods by remember { mutableStateOf<List<DemoSavedPayment>>(emptyList()) }
    var selectedPaymentIndex by remember { mutableStateOf(-1) }
    var paymentMethodsLoading by remember { mutableStateOf(false) }
    var paymentMethodsError by remember { mutableStateOf<String?>(null) }
    val addressesErrorMessage = state.transaction.addressesErrorMessage
    val analytics = state.returnsAnalyticsTracker
    val analyticsContext = state.returnsAnalyticsContext(screenName = "CartSavedPayments", sourceSurface = "cart_saved_payments")
    var lastPaymentMethodFailureCode by remember { mutableStateOf<String?>(null) }
    var lastPaymentMethodFailureAt by remember { mutableStateOf<TimeMark?>(null) }

    fun emitPaymentMethodsFailure(
        code: String,
        message: String?,
    ) {
        val lastCode = lastPaymentMethodFailureCode
        val lastMark = lastPaymentMethodFailureAt
        val withinCooldown = lastCode == code && lastMark != null && lastMark.elapsedNow() < 8.seconds
        if (withinCooldown) return

        lastPaymentMethodFailureCode = code
        lastPaymentMethodFailureAt = TimeSource.Monotonic.markNow()
        analytics.returnsPaymentMethodsFetchFailed(
            context = analyticsContext,
            errorCode = code,
            errorMessage = message,
        )
    }

    LaunchedEffect(sessionToken) {
        if (sessionToken.isNullOrBlank()) {
            paymentMethods = emptyList()
            selectedPaymentIndex = -1
            paymentMethodsError = "Sign in again to load payment methods."
            emitPaymentMethodsFailure(code = "PAYMENT_METHODS_AUTH_MISSING", message = paymentMethodsError)
            return@LaunchedEffect
        }
        paymentMethodsLoading = true
        paymentMethodsError = null
        val liveMethods = state.fetchCheckoutPaymentMethods().orEmpty()
        paymentMethodsLoading = false
        if (liveMethods.isEmpty()) {
            paymentMethods = emptyList()
            selectedPaymentIndex = -1
            paymentMethodsError = "No payment methods available from checkout service."
            emitPaymentMethodsFailure(code = "PAYMENT_METHODS_EMPTY", message = paymentMethodsError)
            return@LaunchedEffect
        }

        paymentMethods = liveMethods.mapIndexed { index, method -> method.toSavedPayment(isDefault = index == 0) }
        selectedPaymentIndex = 0
    }

    suspend fun reloadPaymentMethods() {
        val token = sessionToken
        if (token.isNullOrBlank()) {
            paymentMethods = emptyList()
            selectedPaymentIndex = -1
            paymentMethodsError = "Sign in again to load payment methods."
            emitPaymentMethodsFailure(code = "PAYMENT_METHODS_AUTH_MISSING", message = paymentMethodsError)
            return
        }

        paymentMethodsLoading = true
        paymentMethodsError = null
        val liveMethods = state.fetchCheckoutPaymentMethods().orEmpty()
        paymentMethodsLoading = false

        if (liveMethods.isEmpty()) {
            paymentMethods = emptyList()
            selectedPaymentIndex = -1
            paymentMethodsError = "No payment methods available from checkout service."
            emitPaymentMethodsFailure(code = "PAYMENT_METHODS_EMPTY", message = paymentMethodsError)
            return
        }

        paymentMethods = liveMethods.mapIndexed { index, method -> method.toSavedPayment(isDefault = index == 0) }
        selectedPaymentIndex = 0
    }

    Box(modifier = modifier.fillMaxSize().background(cartBg)) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 96.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    TextButton(onClick = onBack) { Text("Back", color = cartAccent) }
                    Text("Cart", color = cartText, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                    Text("${cartItems.size} items", color = cartMuted, style = MaterialTheme.typography.labelMedium)
                }
            }

            if (!paymentMethodsLoading && !paymentMethodsError.isNullOrBlank()) {
                item {
                    Surface(
                        color = NotWhatColors.surfaceContainerHigh,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("Payment methods unavailable", color = cartText, fontWeight = FontWeight.Bold)
                            Text(
                                paymentMethodsError ?: "Unable to load payment methods.",
                                color = cartMuted,
                                style = MaterialTheme.typography.bodySmall,
                            )
                            TextButton(onClick = {
                                analytics.returnsPaymentMethodsRetryTapped(context = analyticsContext)
                                scope.launch { reloadPaymentMethods() }
                            }) {
                                Text("Retry payment methods", color = cartAccent)
                            }
                        }
                    }
                }
            }

            if (!addressesErrorMessage.isNullOrBlank()) {
                item {
                    Surface(
                        color = NotWhatColors.surfaceContainerHigh,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("Address sync issue", color = cartText, fontWeight = FontWeight.Bold)
                            Text(addressesErrorMessage, color = cartMuted, style = MaterialTheme.typography.bodySmall)
                            TextButton(onClick = {
                                val token = sessionToken ?: return@TextButton
                                scope.launch { state.transaction.loadAddresses(token) }
                            }) {
                                Text("Retry address fetch", color = cartAccent)
                            }
                        }
                    }
                }
            }

            items(cartItems) { cartItem ->
                val product = cartItem.productId
                Surface(
                    modifier = Modifier.fillMaxWidth().clickable { product?.let { onOpenProduct(it) } },
                    color = cartSurface,
                    shape = RoundedCornerShape(16.dp),
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(12.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        CheckoutImage(
                            url = product?.displayImageUrl ?: "",
                            contentDescription = product?.displayTitle ?: "",
                            modifier = Modifier.size(84.dp),
                            shape = RoundedCornerShape(12.dp),
                        )
                        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(product?.displayTitle ?: "Product", color = cartText, fontWeight = FontWeight.Bold, maxLines = 1)
                            Text(product?.displayStoreName ?: "", color = cartMuted, style = MaterialTheme.typography.bodySmall)
                            Text("₹${cartItem.priceSnapshot.toInt()}", color = cartAccent, fontWeight = FontWeight.Bold)
                        }
                        Surface(color = cartSurfaceHigh, shape = RoundedCornerShape(10.dp)) {
                            Text(
                                "Qty ${cartItem.quantity}",
                                color = cartText,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                                style = MaterialTheme.typography.labelSmall,
                            )
                        }
                    }
                }
            }

            item {
                Surface(color = cartSurface, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text("Saved Payments", color = cartText, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        if (paymentMethodsLoading) {
                            CircularProgressIndicator(color = cartAccent)
                        } else if (paymentMethods.isEmpty()) {
                            Text(paymentMethodsError ?: "No payment methods available.", color = cartMuted)
                            TextButton(onClick = {
                                analytics.returnsPaymentMethodsRetryTapped(context = analyticsContext)
                                scope.launch { reloadPaymentMethods() }
                            }) {
                                Text("Retry", color = cartAccent)
                            }
                        } else {
                            paymentMethods.forEachIndexed { index, payment ->
                                val isSelected = selectedPaymentIndex == index
                                Surface(
                                    color = if (isSelected) cartAccent.copy(alpha = 0.12f) else cartSurfaceHigh,
                                    shape = RoundedCornerShape(12.dp),
                                    modifier = Modifier.fillMaxWidth().clickable { selectedPaymentIndex = index },
                                ) {
                                    Column(
                                        modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
                                        verticalArrangement = Arrangement.spacedBy(8.dp),
                                    ) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
                                            Column {
                                                Text(payment.titleLine(), color = cartText, fontWeight = FontWeight.SemiBold)
                                                Text(payment.holderName, color = cartMuted, style = MaterialTheme.typography.bodySmall)
                                            }
                                            Row(
                                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                                verticalAlignment = Alignment.CenterVertically,
                                            ) {
                                                if (payment.isDefault) {
                                                    Surface(color = cartAccent.copy(alpha = 0.2f), shape = RoundedCornerShape(8.dp)) {
                                                        Text(
                                                            "Default",
                                                            color = cartAccent,
                                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                                            style = MaterialTheme.typography.labelSmall,
                                                        )
                                                    }
                                                }
                                                if (isSelected) {
                                                    Surface(color = Color.White.copy(alpha = 0.16f), shape = RoundedCornerShape(8.dp)) {
                                                        Text(
                                                            "Selected",
                                                            color = cartText,
                                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                                            style = MaterialTheme.typography.labelSmall,
                                                        )
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            Text(
                                "Payment methods are sourced from checkout service.",
                                color = cartMuted,
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }
                    }
                }
            }

            item {
                Surface(color = cartSurface, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text("Price Details", color = cartText, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Subtotal", color = cartMuted)
                            Text(subtotal, color = cartText)
                        }
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Shipping", color = cartMuted)
                            Text(shipping, color = cartText)
                        }
                        HorizontalDivider(color = Color.White.copy(alpha = 0.12f))
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Total", color = cartText, fontWeight = FontWeight.Bold)
                            Text(total, color = cartAccent, fontWeight = FontWeight.Black)
                        }
                    }
                }
            }
        }

        Surface(
            modifier = Modifier.align(Alignment.BottomCenter).fillMaxWidth(),
            color = cartBg.copy(alpha = 0.96f),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column {
                    Text("Payable", color = cartMuted, style = MaterialTheme.typography.labelSmall)
                    Text(total, color = cartText, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                }
                Button(
                    onClick = {
                        val selectedPayment = paymentMethods.getOrNull(selectedPaymentIndex) ?: return@Button
                        onProceedToCheckout(
                            CheckoutDraft(
                                items =
                                    cartItems.map { item ->
                                        DemoCartItem(
                                            product =
                                                DemoProduct(
                                                    name = item.productId?.displayTitle ?: "Product",
                                                    price = "\u20b9${item.priceSnapshot.toInt()}",
                                                    store = item.productId?.displayStoreName ?: "",
                                                    category = item.productId?.category ?: "",
                                                    imageUrl = item.productId?.displayImageUrl ?: "",
                                                ),
                                            size = "-",
                                            quantity = item.quantity,
                                        )
                                    },
                                selectedPayment = selectedPayment,
                                subtotal = subtotal,
                                shipping = shipping,
                                total = total,
                                shippingAddress = shippingAddress,
                            ),
                        )
                    },
                    modifier = Modifier.weight(1f).height(52.dp),
                    shape = RoundedCornerShape(16.dp),
                    enabled = cartItems.isNotEmpty() && selectedPaymentIndex >= 0 && paymentMethods.isNotEmpty(),
                    colors = ButtonDefaults.buttonColors(containerColor = cartAccent),
                ) {
                    Text("PROCEED TO CHECKOUT", color = Color.White, fontWeight = FontWeight.Black)
                }
            }
        }
    }
}

private fun CheckoutPaymentMethod.toSavedPayment(isDefault: Boolean): DemoSavedPayment =
    DemoSavedPayment(
        method = this,
        label = displayLabel(),
        maskedNumber = defaultMaskedText(),
        holderName = defaultSubtitle(),
        isDefault = isDefault,
    )

private fun DemoSavedPayment.titleLine(): String = "$label $maskedNumber".trim()

@Composable
private fun CheckoutImage(
    url: String,
    contentDescription: String,
    modifier: Modifier,
    shape: RoundedCornerShape,
) {
    AsyncImage(
        model = url,
        contentDescription = contentDescription,
        modifier = modifier.clip(shape),
        contentScale = ContentScale.Crop,
    )
}

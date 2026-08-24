package com.notwhat.shared.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
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
import com.notwhat.shared.checkout.displayLabel
import com.notwhat.shared.order.OrderDto
import com.notwhat.shared.returns.ReturnReason
import com.notwhat.shared.ui.PlatformImagePicker
import com.notwhat.shared.ui.PlatformMediaFileReader
import io.github.alexzhirkevich.qrose.rememberQrCodePainter
import kotlinx.coroutines.launch

@Composable
internal fun OrderDetailScreen(
    modifier: Modifier,
    order: OrderDto,
    state: NotWhatAppState,
    onBack: () -> Unit,
) {
    val bg = NotWhatColors.background
    val surface = NotWhatColors.surface
    val surfaceHigh = NotWhatColors.surfaceContainerHigh
    val outline = NotWhatColors.outline
    val text = NotWhatColors.onSurface
    val muted = NotWhatColors.onSurfaceVariant
    val accent = NotWhatAuthTokens.accent

    val canShowTracking = order.status.lowercase() in setOf("shipped", "delivered")
    val statusStyle = orderDetailStatusStyle(order.status)
    val normalizedOrderStatus = order.status.lowercase()
    val normalizedReturnInfoStatus =
        order.returnInfo
            ?.returnStatus
            ?.lowercase()
            .orEmpty()
    val normalizedItemReturnStatus =
        order.items
            .asSequence()
            .mapNotNull { item ->
                val status = item.status.lowercase()
                when {
                    status.startsWith("return_") || status in setOf("returned", "refunded") -> status
                    !item.returnStatus.isNullOrBlank() -> item.returnStatus.lowercase()
                    else -> null
                }
            }.firstOrNull()

    val effectiveReturnStatus =
        when {
            normalizedOrderStatus in setOf("return_requested", "return_approved", "return_rejected", "returned", "refunded") -> {
                normalizedOrderStatus
            }

            normalizedReturnInfoStatus == "requested" -> {
                "return_requested"
            }

            normalizedReturnInfoStatus == "approved" -> {
                "return_approved"
            }

            normalizedReturnInfoStatus == "rejected" -> {
                "return_rejected"
            }

            normalizedReturnInfoStatus in setOf("in_transit", "received", "completed") -> {
                when (normalizedReturnInfoStatus) {
                    "in_transit" -> "return_approved"
                    "received" -> "returned"
                    else -> "refunded"
                }
            }

            !normalizedItemReturnStatus.isNullOrBlank() -> {
                normalizedItemReturnStatus
            }

            else -> {
                null
            }
        }

    val isDelivered = normalizedOrderStatus == "delivered"
    val alreadyReturnRequested = !effectiveReturnStatus.isNullOrBlank()

    var showReturnSheet by remember { mutableStateOf(false) }
    var selectedReason by remember { mutableStateOf<ReturnReason?>(null) }
    var returnDescription by remember { mutableStateOf("") }
    var isSubmitting by remember { mutableStateOf(false) }
    var isUploadingImage by remember { mutableStateOf(false) }
    val returnImageUrls = remember { mutableStateListOf<String>() }
    var returnSuccess by remember { mutableStateOf(false) }
    var returnError by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    val reasonLabels =
        mapOf(
            ReturnReason.wrong_item to "Wrong item received",
            ReturnReason.damaged to "Item arrived damaged",
            ReturnReason.not_as_described to "Not as described",
            ReturnReason.changed_mind to "Changed my mind",
        )

    LaunchedEffect(order.id, alreadyReturnRequested) {
        if (alreadyReturnRequested && state.buyerReturns.none { it.orderId == order.id }) {
            state.loadBuyerReturns()
        }
    }

    // Return request bottom sheet
    if (showReturnSheet) {
        androidx.compose.ui.window.Dialog(onDismissRequest = { if (!isSubmitting) showReturnSheet = false }) {
            Surface(color = surface, shape = RoundedCornerShape(20.dp)) {
                Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Text("Request a Return", color = text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text("Select the reason for returning this order.", color = muted, style = MaterialTheme.typography.bodySmall)

                    returnError?.let {
                        Surface(
                            color = Color(0xFFEF4444).copy(alpha = 0.12f),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text(
                                it,
                                color = Color(0xFFEF4444),
                                modifier = Modifier.padding(10.dp),
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }
                    }

                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        ReturnReason.values().forEach { reason ->
                            val isSelected = selectedReason == reason
                            Surface(
                                color = if (isSelected) accent.copy(alpha = 0.15f) else surfaceHigh,
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.fillMaxWidth().clickable { selectedReason = reason },
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 11.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text(
                                        reasonLabels[reason] ?: reason.name,
                                        color = text,
                                        fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                                    )
                                    if (isSelected) Text("✓", color = accent, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }

                    OutlinedTextField(
                        value = returnDescription,
                        onValueChange = { returnDescription = it },
                        placeholder = { Text("Additional details (optional)", color = muted) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = false,
                        minLines = 2,
                    )

                    // Photo evidence section
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                "Photos (optional)",
                                color = text,
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.SemiBold,
                            )
                            if (isUploadingImage) {
                                CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp, color = accent)
                            }
                        }
                        if (returnImageUrls.isNotEmpty()) {
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                items(returnImageUrls) { url ->
                                    Box {
                                        AsyncImage(
                                            model = url,
                                            contentDescription = null,
                                            modifier = Modifier.size(72.dp).clip(RoundedCornerShape(10.dp)),
                                            contentScale = ContentScale.Crop,
                                        )
                                        // remove button
                                        Surface(
                                            color = Color.Black.copy(alpha = 0.6f),
                                            shape = RoundedCornerShape(50),
                                            modifier =
                                                Modifier
                                                    .size(
                                                        20.dp,
                                                    ).align(Alignment.TopEnd)
                                                    .clickable { returnImageUrls.remove(url) },
                                        ) {
                                            Text(
                                                "✕",
                                                color = Color.White,
                                                style = MaterialTheme.typography.labelSmall,
                                                modifier = Modifier.padding(2.dp),
                                            )
                                        }
                                    }
                                }
                            }
                        }
                        if (returnImageUrls.size < 5) {
                            TextButton(
                                onClick = {
                                    if (PlatformImagePicker.isMultiAvailable()) {
                                        PlatformImagePicker.launchMulti { uris ->
                                            if (uris.isEmpty()) return@launchMulti
                                            scope.launch {
                                                isUploadingImage = true
                                                for (uri in uris.take(5 - returnImageUrls.size)) {
                                                    val bytes = PlatformMediaFileReader.readBytes(uri) ?: continue
                                                    val name = PlatformMediaFileReader.fileName(uri, "return-photo.jpg")
                                                    val mime = PlatformMediaFileReader.guessMimeType(uri, "image/jpeg")
                                                    state
                                                        .uploadReturnImage(bytes, name, mime)
                                                        .getOrNull()
                                                        ?.let { returnImageUrls.add(it) }
                                                }
                                                isUploadingImage = false
                                            }
                                        }
                                    } else {
                                        PlatformImagePicker.launch pickerLaunch@{ uri ->
                                            uri ?: return@pickerLaunch
                                            scope.launch imageUpload@{
                                                isUploadingImage = true
                                                val bytes =
                                                    PlatformMediaFileReader.readBytes(uri)
                                                        ?: run {
                                                            isUploadingImage = false
                                                            return@imageUpload
                                                        }
                                                val name = PlatformMediaFileReader.fileName(uri, "return-photo.jpg")
                                                val mime = PlatformMediaFileReader.guessMimeType(uri, "image/jpeg")
                                                state
                                                    .uploadReturnImage(bytes, name, mime)
                                                    .getOrNull()
                                                    ?.let { returnImageUrls.add(it) }
                                                isUploadingImage = false
                                            }
                                        }
                                    }
                                },
                                enabled = !isUploadingImage && !isSubmitting,
                            ) { Text("+ Add Photo", color = accent) }
                        }
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                        TextButton(onClick = { showReturnSheet = false }, modifier = Modifier.weight(1f), enabled = !isSubmitting) {
                            Text("Cancel", color = muted)
                        }
                        Button(
                            onClick = {
                                val reason = selectedReason
                                if (reason == null) {
                                    returnError = "Please select a reason."
                                    return@Button
                                }
                                returnError = null
                                isSubmitting = true
                                scope.launch {
                                    val result =
                                        state.submitBuyerReturnRequest(
                                            order.id,
                                            reason,
                                            returnDescription,
                                            returnImageUrls.toList(),
                                        )
                                    isSubmitting = false
                                    when (result) {
                                        is com.notwhat.shared.core.NetworkResult.Success -> {
                                            returnSuccess = true
                                            showReturnSheet = false
                                        }

                                        is com.notwhat.shared.core.NetworkResult.Failure -> {
                                            returnError = result.error.userMessage()
                                        }
                                    }
                                }
                            },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = accent),
                            enabled = !isSubmitting,
                        ) { Text(if (isSubmitting) "Submitting…" else "Submit Return", color = Color.White, fontWeight = FontWeight.Bold) }
                    }
                }
            }
        }
    }

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
                    Text("Order Details", color = text, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                    Text("", modifier = Modifier.size(56.dp)) // Spacer for alignment
                }
            }

            item {
                Surface(
                    color = surface,
                    shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(1.dp, outline.copy(alpha = 0.42f)),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text("Order ${order.id.take(8)}", color = text, fontWeight = FontWeight.Bold)
                                Text(order.createdAt ?: "", color = muted, style = MaterialTheme.typography.labelSmall)
                            }
                            Surface(
                                color = statusStyle.color.copy(alpha = 0.14f),
                                shape = RoundedCornerShape(999.dp),
                                border = BorderStroke(1.dp, statusStyle.color.copy(alpha = 0.28f)),
                            ) {
                                Text(
                                    statusStyle.label,
                                    color = statusStyle.color,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                        }

                        HorizontalDivider(color = outline.copy(alpha = 0.35f))

                        Text("Delivery Address", color = text, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                            val addr = order.deliveryAddress
                            if (addr != null) {
                                Text(addr.fullName, color = text, fontWeight = FontWeight.SemiBold)
                                Text(addr.phone, color = muted, style = MaterialTheme.typography.labelSmall)
                                Text(
                                    "${addr.addressLine1}${addr.addressLine2?.let { ", $it" } ?: ""}",
                                    color = muted,
                                    style = MaterialTheme.typography.labelSmall,
                                )
                                Text(
                                    "${addr.city}, ${addr.state} ${addr.pincode}",
                                    color = muted,
                                    style = MaterialTheme.typography.labelSmall,
                                )
                            } else {
                                Text("Address not available", color = muted)
                            }
                        }
                    }
                }
            }

            item {
                Surface(
                    color = surface,
                    shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(1.dp, outline.copy(alpha = 0.42f)),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("Order Items", color = text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)

                        order.items.forEach { item ->
                            val displayImage =
                                item.imageSnapshot?.takeIf { it.isNotBlank() }
                                    ?: item.productId?.displayImageUrl
                            val displayTitle =
                                item.titleSnapshot.takeIf { it.isNotBlank() }
                                    ?: item.productId?.displayTitle ?: "Product"
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                if (!displayImage.isNullOrBlank()) {
                                    AsyncImage(
                                        model = displayImage,
                                        contentDescription = displayTitle,
                                        modifier = Modifier.size(56.dp).clip(RoundedCornerShape(8.dp)),
                                        contentScale = ContentScale.Crop,
                                    )
                                } else {
                                    Surface(
                                        color = accent.copy(alpha = 0.08f),
                                        shape = RoundedCornerShape(8.dp),
                                        modifier =
                                            Modifier
                                                .size(
                                                    56.dp,
                                                ).border(BorderStroke(1.dp, accent.copy(alpha = 0.25f)), RoundedCornerShape(8.dp)),
                                    ) {}
                                }

                                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Text(displayTitle, color = text, fontWeight = FontWeight.SemiBold, maxLines = 2)
                                    Text("Qty: ${item.quantity}", color = muted, style = MaterialTheme.typography.labelSmall)
                                    Text(
                                        "₹${formatOrderDetailAmount(item.priceSnapshot)} x ${item.quantity}",
                                        color = accent,
                                        fontWeight = FontWeight.Bold,
                                    )
                                }
                            }

                            if (order.items.indexOf(item) < order.items.size - 1) {
                                HorizontalDivider(color = outline.copy(alpha = 0.35f))
                            }
                        }
                    }
                }
            }

            item {
                Surface(
                    color = surface,
                    shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(1.dp, outline.copy(alpha = 0.42f)),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text("Order Summary", color = text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Text("Payment Method", color = muted)
                            Text(order.paymentMethod.displayPaymentMethodLabel() ?: "Not available", color = text)
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Text("Payment Status", color = muted)
                            Text(order.paymentStatus?.humanizeToken() ?: "Pending", color = text)
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Text("Subtotal", color = muted)
                            Text("₹${formatOrderDetailAmount(order.subtotal)}", color = text)
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Text("Shipping", color = muted)
                            Text("₹${formatOrderDetailAmount(order.shippingAmount)}", color = text)
                        }

                        HorizontalDivider(color = outline.copy(alpha = 0.35f))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Text("Total", color = text, fontWeight = FontWeight.Bold)
                            Text("₹${formatOrderDetailAmount(order.totalAmount)}", color = accent, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            // Pay-on-delivery block — backend attaches this only once the store's items are delivered.
            order.storePayment?.let { storePayment ->
                item {
                    Surface(
                        color = surface,
                        shape = RoundedCornerShape(16.dp),
                        border = BorderStroke(1.dp, outline.copy(alpha = 0.42f)),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Column(
                            modifier = Modifier.fillMaxWidth().padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Text(
                                "Pay ${storePayment.storeName}",
                                color = text,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                            )
                            val qrData = storePayment.qrCode
                            if (qrData.isNullOrBlank()) {
                                Text(
                                    storePayment.qrCodeLabel.ifBlank { "This store has not set up UPI payments yet." },
                                    color = muted,
                                    style = MaterialTheme.typography.bodySmall,
                                )
                            } else {
                                Text(
                                    "Scan this QR to pay the seller for this delivered order.",
                                    color = muted,
                                    style = MaterialTheme.typography.bodySmall,
                                )
                                Surface(color = Color.White, shape = RoundedCornerShape(12.dp)) {
                                    Image(
                                        painter = rememberQrCodePainter(qrData),
                                        contentDescription = storePayment.qrCodeLabel,
                                        modifier = Modifier.size(190.dp).padding(12.dp),
                                    )
                                }
                                Text(storePayment.upiId, color = muted, style = MaterialTheme.typography.bodySmall)
                            }
                            Text(
                                "₹${formatOrderDetailAmount(storePayment.amount)}",
                                color = accent,
                                fontWeight = FontWeight.Bold,
                                style = MaterialTheme.typography.titleMedium,
                            )
                        }
                    }
                }
            }

            // Return action — only shown for delivered orders
            if (isDelivered || alreadyReturnRequested) {
                item {
                    Surface(
                        color = surface,
                        shape = RoundedCornerShape(16.dp),
                        border = BorderStroke(1.dp, outline.copy(alpha = 0.42f)),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Text(
                                "Returns & Refunds",
                                color = text,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                            )

                            when {
                                returnSuccess || alreadyReturnRequested -> {
                                    val buyerReturnMessage =
                                        when (effectiveReturnStatus ?: normalizedOrderStatus) {
                                            "return_approved" -> "Return approved. Your order will be picked up shortly."
                                            "return_rejected" -> "Return request was rejected. You can contact support for help."
                                            "returned" -> "Return received by seller. Refund will be processed shortly."
                                            "refunded" -> "Refund completed for this return request."
                                            else -> "Return request submitted. Our team will review it shortly."
                                        }
                                    Surface(
                                        color = Color(0xFF10B981).copy(alpha = 0.12f),
                                        shape = RoundedCornerShape(10.dp),
                                        modifier = Modifier.fillMaxWidth(),
                                    ) {
                                        Text(
                                            buyerReturnMessage,
                                            color = Color(0xFF10B981),
                                            modifier = Modifier.padding(12.dp),
                                            style = MaterialTheme.typography.bodySmall,
                                            fontWeight = FontWeight.SemiBold,
                                        )
                                    }

                                    // Resolve reason: prefer in-session selection, then persisted return
                                    val returnReasonLabel =
                                        run {
                                            val inSessionReason = if (returnSuccess) selectedReason else null
                                            val rawReason =
                                                inSessionReason?.name
                                                    ?: state.buyerReturns.firstOrNull { it.orderId == order.id }?.reason
                                                    ?: order.returnInfo?.returnReason?.takeIf { it.isNotBlank() }
                                            when (rawReason) {
                                                "wrong_item" -> "Wrong item received"
                                                "damaged" -> "Item arrived damaged"
                                                "not_as_described" -> "Not as described"
                                                "changed_mind" -> "Changed my mind"
                                                else -> rawReason
                                            }
                                        }
                                    val returnDesc =
                                        if (returnSuccess) {
                                            returnDescription.ifBlank { null }
                                        } else {
                                            state.buyerReturns.firstOrNull { it.orderId == order.id }?.description
                                                ?: order.returnInfo?.returnDescription?.takeIf { it.isNotBlank() }
                                        }
                                    if (!returnReasonLabel.isNullOrBlank()) {
                                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                            Text(
                                                "Return Reason",
                                                color = text,
                                                style = MaterialTheme.typography.labelMedium,
                                                fontWeight = FontWeight.Bold,
                                            )
                                            Text(
                                                returnReasonLabel,
                                                color = muted,
                                                style = MaterialTheme.typography.bodySmall,
                                                fontWeight = FontWeight.SemiBold,
                                            )
                                            if (!returnDesc.isNullOrBlank()) {
                                                Text(
                                                    returnDesc,
                                                    color = muted,
                                                    style = MaterialTheme.typography.bodySmall,
                                                )
                                            }
                                        }
                                    }
                                }

                                isDelivered -> {
                                    Text(
                                        "Not satisfied with your order? You can request a return.",
                                        color = muted,
                                        style = MaterialTheme.typography.bodySmall,
                                    )
                                    Button(
                                        onClick = { showReturnSheet = true },
                                        modifier = Modifier.fillMaxWidth(),
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF97316)),
                                        shape = RoundedCornerShape(12.dp),
                                    ) {
                                        Text("Request Return / Refund", color = Color.White, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Tracking (shipped or delivered)
            if (canShowTracking && !order.trackingNumber.isNullOrBlank()) {
                item {
                    Surface(
                        color = surface,
                        shape = RoundedCornerShape(16.dp),
                        border = BorderStroke(1.dp, outline.copy(alpha = 0.42f)),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Text("Tracking", color = text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Tracking No.", color = muted)
                                Text(order.trackingNumber.orEmpty(), color = text, fontWeight = FontWeight.SemiBold)
                            }
                        }
                    }
                }
            }
        }
    }
}

private data class OrderDetailStatusStyle(
    val label: String,
    val color: Color,
)

private fun orderDetailStatusStyle(status: String): OrderDetailStatusStyle {
    val normalized = status.lowercase()
    val color =
        when (normalized) {
            "awaiting_seller_acceptance" -> Color(0xFF9A6700)
            "processing", "confirmed", "placed" -> NotWhatColors.primary
            "shipped", "delivered" -> Color(0xFF1E7A43)
            "return_requested", "return_approved", "return_rejected", "returned", "refunded" -> Color(0xFFD97706)
            "cancelled", "rejected" -> Color(0xFFB42318)
            else -> NotWhatColors.onSurfaceVariant
        }

    val label =
        normalized.replace('_', ' ').split(' ').joinToString(" ") { token ->
            token.replaceFirstChar { ch -> ch.uppercase() }
        }

    return OrderDetailStatusStyle(label = label, color = color)
}

private fun formatOrderDetailAmount(amount: Double): String {
    val whole = amount.toLong()
    return if (amount == whole.toDouble()) {
        whole.toString()
    } else {
        amount.toString()
    }
}

private fun String?.displayPaymentMethodLabel(): String? {
    val raw = this?.trim().orEmpty()
    if (raw.isBlank()) return null

    val parsed = CheckoutPaymentMethod.fromRaw(raw)
    return if (parsed != CheckoutPaymentMethod.UNKNOWN) {
        parsed.displayLabel()
    } else {
        raw.humanizeToken()
    }
}

private fun String.humanizeToken(): String =
    trim()
        .replace('_', ' ')
        .split(' ')
        .filter { it.isNotBlank() }
        .joinToString(" ") { token ->
            token.lowercase().replaceFirstChar { ch -> ch.uppercase() }
        }

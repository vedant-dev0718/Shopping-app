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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.notwhat.shared.catalog.CreateProductRequestDto
import com.notwhat.shared.core.NetworkResult
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

// Sample data for categories and regions (in production, these would come from the backend)
val PRODUCT_CATEGORIES =
    listOf(
        "Sarees",
        "Kurtis",
        "Lehengas",
        "Dupattas",
        "Salwar Kameez",
        "Blouses",
        "Jewelry",
        "Accessories",
        "Fabrics",
        "Other",
    )

val PRODUCT_REGIONS =
    listOf(
        "Rajasthan",
        "Gujarat",
        "Maharashtra",
        "Karnataka",
        "Tamil Nadu",
        "Telangana",
        "Andhra Pradesh",
        "West Bengal",
        "Punjab",
        "Uttar Pradesh",
    )

val PRODUCT_SIZES = listOf("XS", "S", "M", "L", "XL", "XXL", "3XL")

@Composable
internal fun ProductOnboardingScreen(
    modifier: Modifier,
    state: NotWhatAppState,
    onBack: () -> Unit,
    onProductCreated: () -> Unit,
) {
    val bg = NotWhatColors.background
    val surface = NotWhatColors.surface
    val text = NotWhatColors.onSurface
    val muted = NotWhatColors.onSurfaceVariant
    val accent = NotWhatAuthTokens.accent

    var currentStep by remember { mutableStateOf(0) } // 0: Basic Info, 1: Media, 2: Pricing & Inventory, 3: Review
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("") }
    var subcategory by remember { mutableStateOf("") }
    var region by remember { mutableStateOf("") }
    var price by remember { mutableStateOf("") }
    var stock by remember { mutableStateOf("") }
    var selectedSizes by remember { mutableStateOf(setOf<String>()) }
    var sku by remember { mutableStateOf("") }
    var productLink by remember { mutableStateOf("") }
    var tags by remember { mutableStateOf(listOf<String>()) }
    var newTag by remember { mutableStateOf("") }
    var imageUrls by remember { mutableStateOf(listOf<String>()) }
    var imagePreviewUrls by remember { mutableStateOf(listOf<String>()) }
    var bargainEnabled by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(false) }
    var isUploadingImage by remember { mutableStateOf(false) }
    var submitError by remember { mutableStateOf<String?>(null) }
    // URIs queued by the native picker; LaunchedEffect drives the actual upload
    var pendingUploadUris by remember { mutableStateOf<List<String>>(emptyList()) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(pendingUploadUris) {
        val uris = pendingUploadUris
        if (uris.isEmpty()) return@LaunchedEffect
        val token = state.currentSession?.authToken
        if (token.isNullOrBlank()) {
            submitError = "Please sign in again to upload product images."
            pendingUploadUris = emptyList()
            return@LaunchedEffect
        }

        isUploadingImage = true
        submitError = null
        val uploadedUrls = mutableListOf<String>()
        val failedUris = mutableListOf<String>()

        try {
            for (uri in uris) {
                val imageBytes = withContext(Dispatchers.Default) { PlatformMediaFileReader.readBytes(uri) }
                if (imageBytes == null) {
                    failedUris.add(uri)
                    if (submitError == null) submitError = "Could not read one or more images."
                    continue
                }
                val uploadResult =
                    state.sellerContent.uploadImage(
                        data = imageBytes,
                        fileName = PlatformMediaFileReader.fileName(uri, "product-image.jpg"),
                        bearerToken = token,
                        mimeType = PlatformMediaFileReader.guessMimeType(uri, "image/jpeg"),
                    )
                when (uploadResult) {
                    is NetworkResult.Success -> {
                        uploadedUrls.add(uploadResult.data.imageUrl)
                    }

                    is NetworkResult.Failure -> {
                        failedUris.add(uri)
                        if (submitError == null) submitError = uploadResult.error.userMessage()
                    }
                }
            }
        } catch (e: Exception) {
            if (submitError == null) submitError = "Upload failed: ${e.message ?: "Unknown error"}"
        } finally {
            isUploadingImage = false
            imagePreviewUrls = imagePreviewUrls.filter { it !in failedUris }
            imageUrls = imageUrls + uploadedUrls
            pendingUploadUris = emptyList()
        }
    }

    val stepTitles = listOf("Basic Info", "Media", "Pricing & Stock", "Review & Submit")
    val isStepValid =
        when (currentStep) {
            0 -> title.isNotBlank() && description.isNotBlank() && category.isNotBlank() && region.isNotBlank()
            1 -> imageUrls.isNotEmpty()
            2 -> price.isNotBlank() && stock.isNotBlank()
            3 -> true
            else -> false
        }

    Column(
        modifier =
            modifier
                .fillMaxSize()
                .background(bg),
        verticalArrangement = Arrangement.spacedBy(0.dp),
    ) {
        // Header
        Row(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .padding(SellerUiTokens.screenPadding)
                    .padding(bottom = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            TextButton(onClick = onBack) {
                Text("Back", color = accent)
            }
            Text("Add Product", color = text, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
            Text("${currentStep + 1}/${stepTitles.size}", color = muted, style = MaterialTheme.typography.labelSmall)
        }

        // Step Indicator
        Row(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = SellerUiTokens.screenPadding),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            repeat(stepTitles.size) { index ->
                Box(
                    modifier =
                        Modifier
                            .weight(1f)
                            .height(4.dp)
                            .clip(RoundedCornerShape(2.dp))
                            .background(if (index <= currentStep) accent else surface),
                )
            }
        }

        // Step Label
        Text(
            stepTitles[currentStep],
            color = text,
            style = MaterialTheme.typography.bodySmall,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(SellerUiTokens.screenPadding).padding(top = 12.dp, bottom = 0.dp),
        )

        // Content
        LazyColumn(
            modifier = Modifier.weight(1f).fillMaxWidth(),
            contentPadding = PaddingValues(SellerUiTokens.screenPadding),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            submitError?.let { message ->
                item {
                    Surface(color = Color(0xFF4A1F1F), shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                        Text(
                            text = message,
                            color = Color(0xFFFFC9C9),
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                        )
                    }
                }
            }
            item {
                when (currentStep) {
                    0 -> {
                        ProductOnboardingBasicInfoStep(
                            title = title,
                            onTitleChange = { title = it },
                            description = description,
                            onDescriptionChange = { description = it },
                            category = category,
                            onCategoryChange = { category = it },
                            subcategory = subcategory,
                            onSubcategoryChange = { subcategory = it },
                            region = region,
                            onRegionChange = { region = it },
                            productLink = productLink,
                            onProductLinkChange = { productLink = it },
                            surface = surface,
                            text = text,
                            muted = muted,
                        )
                    }

                    1 -> {
                        ProductOnboardingMediaStep(
                            imageUrls = imagePreviewUrls,
                            onRemoveImageAt = { index ->
                                if (index in imagePreviewUrls.indices) {
                                    imagePreviewUrls = imagePreviewUrls.filterIndexed { itemIndex, _ -> itemIndex != index }
                                }
                                if (index in imageUrls.indices) {
                                    imageUrls = imageUrls.filterIndexed { itemIndex, _ -> itemIndex != index }
                                }
                            },
                            isUploadingImage = isUploadingImage,
                            surface = surface,
                            text = text,
                            muted = muted,
                            accent = accent,
                            onAddImage = {
                                val token = state.currentSession?.authToken
                                if (token.isNullOrBlank()) {
                                    submitError = "Please sign in again to upload product images."
                                    return@ProductOnboardingMediaStep
                                }

                                // Both paths just queue URIs; the LaunchedEffect above drives the actual upload
                                if (PlatformImagePicker.isMultiAvailable()) {
                                    PlatformImagePicker.launchMulti { uris: List<String> ->
                                        if (uris.isEmpty()) return@launchMulti
                                        imagePreviewUrls = (imagePreviewUrls + uris).toList()
                                        pendingUploadUris = uris
                                    }
                                } else {
                                    PlatformImagePicker.launch { uri ->
                                        if (!uri.isNullOrBlank()) {
                                            imagePreviewUrls = imagePreviewUrls + uri
                                            pendingUploadUris = listOf(uri)
                                        }
                                    }
                                }
                            },
                        )
                    }

                    2 -> {
                        ProductOnboardingPricingStep(
                            price = price,
                            onPriceChange = { price = it },
                            stock = stock,
                            onStockChange = { stock = it },
                            selectedSizes = selectedSizes,
                            onToggleSize = { size ->
                                selectedSizes =
                                    if (selectedSizes.contains(size)) {
                                        selectedSizes - size
                                    } else {
                                        selectedSizes + size
                                    }
                            },
                            sku = sku,
                            onSkuChange = { sku = it },
                            tags = tags,
                            newTag = newTag,
                            onNewTagChange = { newTag = it },
                            onAddTag = {
                                if (newTag.isNotBlank() && !tags.contains(newTag)) {
                                    tags = tags + newTag
                                    newTag = ""
                                }
                            },
                            onRemoveTag = { tagToRemove -> tags = tags.filter { it != tagToRemove } },
                            bargainEnabled = bargainEnabled,
                            onBargainEnabledChange = { bargainEnabled = it },
                            surface = surface,
                            text = text,
                            accent = accent,
                        )
                    }

                    3 -> {
                        ProductOnboardingReviewStep(
                            title = title,
                            description = description,
                            category = category,
                            region = region,
                            price = price,
                            stock = stock,
                            sizes = selectedSizes.toList(),
                            imageUrl = imagePreviewUrls.firstOrNull() ?: imageUrls.firstOrNull(),
                            tags = tags,
                            surface = surface,
                            text = text,
                            muted = muted,
                        )
                    }
                }
            }
        }

        // Navigation Buttons
        Row(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .padding(SellerUiTokens.screenPadding),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            if (currentStep > 0) {
                OutlinedButton(
                    onClick = { currentStep-- },
                    modifier = Modifier.weight(1f),
                    shape = SellerUiTokens.radiusButton,
                ) {
                    Text("Previous")
                }
            }

            Button(
                onClick = {
                    if (currentStep < stepTitles.size - 1) {
                        currentStep++
                    } else {
                        val token = state.currentSession?.authToken
                        if (token.isNullOrBlank()) {
                            submitError = "Please sign in again to create products."
                            return@Button
                        }

                        val parsedPrice = price.toDoubleOrNull()
                        val parsedStock = stock.toIntOrNull()
                        if (parsedPrice == null || parsedStock == null) {
                            submitError = "Enter a valid price and stock before submitting."
                            return@Button
                        }

                        scope.launch {
                            isLoading = true
                            submitError = null

                            val result =
                                state.sellerContent.createProduct(
                                    CreateProductRequestDto(
                                        title = title.trim(),
                                        description = description.trim(),
                                        category = category.trim(),
                                        subcategory = subcategory.trim().ifBlank { null },
                                        region = region.trim(),
                                        price = parsedPrice,
                                        sku = sku.trim().ifBlank { null },
                                        stock = parsedStock,
                                        sizes = selectedSizes.toList(),
                                        tags = tags,
                                        imageUrls = imageUrls,
                                        productLink = productLink.trim().ifBlank { null },
                                        bargainEnabled = bargainEnabled,
                                    ),
                                    token,
                                )

                            isLoading = false
                            if (result is com.notwhat.shared.core.NetworkResult.Success) {
                                onProductCreated()
                            } else if (result is com.notwhat.shared.core.NetworkResult.Failure) {
                                submitError = result.error.userMessage()
                            }
                        }
                    }
                },
                modifier = Modifier.weight(if (currentStep == 0) 1f else 1f),
                enabled = isStepValid && !isLoading && !isUploadingImage,
                shape = SellerUiTokens.radiusButton,
                colors = ButtonDefaults.buttonColors(containerColor = accent),
            ) {
                if (isLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                } else if (isUploadingImage) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                } else {
                    Text(if (currentStep == stepTitles.size - 1) "Submit" else "Next", color = Color.White)
                }
            }
        }
    }
}

@Composable
private fun ProductOnboardingBasicInfoStep(
    title: String,
    onTitleChange: (String) -> Unit,
    description: String,
    onDescriptionChange: (String) -> Unit,
    category: String,
    onCategoryChange: (String) -> Unit,
    subcategory: String,
    onSubcategoryChange: (String) -> Unit,
    region: String,
    onRegionChange: (String) -> Unit,
    productLink: String,
    onProductLinkChange: (String) -> Unit,
    surface: Color,
    text: Color,
    muted: Color,
) {
    Surface(
        color = surface,
        shape = SellerUiTokens.radiusInnerCard,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.padding(SellerUiTokens.cardPadding),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text("Product Title", color = text, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodySmall)
            OutlinedTextField(
                value = title,
                onValueChange = onTitleChange,
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("e.g., Handwoven Rajasthani Saree") },
                singleLine = true,
            )

            Text("Description", color = text, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodySmall)
            OutlinedTextField(
                value = description,
                onValueChange = onDescriptionChange,
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .height(100.dp),
                placeholder = { Text("Describe your product, materials, dimensions, etc.") },
            )

            Text("Category", color = text, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodySmall)
            CategoryDropdown(
                selectedCategory = category,
                onCategorySelect = onCategoryChange,
                categories = PRODUCT_CATEGORIES,
                text = text,
                muted = muted,
            )

            if (category.isNotBlank()) {
                Text("Subcategory (Optional)", color = text, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodySmall)
                OutlinedTextField(
                    value = subcategory,
                    onValueChange = onSubcategoryChange,
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text("e.g., Silk, Cotton, Blend") },
                    singleLine = true,
                )
            }

            Text("Region", color = text, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodySmall)
            RegionDropdown(
                selectedRegion = region,
                onRegionSelect = onRegionChange,
                regions = PRODUCT_REGIONS,
                text = text,
                muted = muted,
            )

            Text("Product Link (Optional)", color = text, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodySmall)
            OutlinedTextField(
                value = productLink,
                onValueChange = onProductLinkChange,
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("https://example.com/product") },
                singleLine = true,
            )
        }
    }
}

@Composable
private fun CategoryDropdown(
    selectedCategory: String,
    onCategorySelect: (String) -> Unit,
    categories: List<String>,
    text: Color,
    muted: Color,
) {
    var expanded by remember { mutableStateOf(false) }

    Box(modifier = Modifier.fillMaxWidth()) {
        OutlinedButton(
            onClick = { expanded = true },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(8.dp),
        ) {
            Text(
                selectedCategory.ifBlank { "Select Category" },
                color = if (selectedCategory.isBlank()) muted else text,
                modifier = Modifier.weight(1f),
                textAlign = androidx.compose.ui.text.style.TextAlign.Start,
            )
        }

        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
            modifier = Modifier.fillMaxWidth(0.95f),
        ) {
            categories.forEach { category ->
                DropdownMenuItem(
                    text = { Text(category) },
                    onClick = {
                        onCategorySelect(category)
                        expanded = false
                    },
                )
            }
        }
    }
}

@Composable
private fun RegionDropdown(
    selectedRegion: String,
    onRegionSelect: (String) -> Unit,
    regions: List<String>,
    text: Color,
    muted: Color,
) {
    var expanded by remember { mutableStateOf(false) }

    Box(modifier = Modifier.fillMaxWidth()) {
        OutlinedButton(
            onClick = { expanded = true },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(8.dp),
        ) {
            Text(
                selectedRegion.ifBlank { "Select Region" },
                color = if (selectedRegion.isBlank()) muted else text,
                modifier = Modifier.weight(1f),
                textAlign = androidx.compose.ui.text.style.TextAlign.Start,
            )
        }

        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
            modifier = Modifier.fillMaxWidth(0.95f),
        ) {
            regions.forEach { region ->
                DropdownMenuItem(
                    text = { Text(region) },
                    onClick = {
                        onRegionSelect(region)
                        expanded = false
                    },
                )
            }
        }
    }
}

@Composable
private fun ProductOnboardingMediaStep(
    imageUrls: List<String>,
    onRemoveImageAt: (Int) -> Unit,
    isUploadingImage: Boolean,
    surface: Color,
    text: Color,
    muted: Color,
    accent: Color,
    onAddImage: () -> Unit,
) {
    Surface(
        color = surface,
        shape = SellerUiTokens.radiusInnerCard,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.padding(SellerUiTokens.cardPadding),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text("Product Images", color = text, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodySmall)
            Text(
                "Add at least 1 image. Add multiple images to showcase different angles.",
                color = muted,
                style = MaterialTheme.typography.bodySmall,
            )

            // Image Gallery Display
            if (imageUrls.isNotEmpty()) {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    itemsIndexed(imageUrls) { index, imageUrl ->
                        Box(
                            modifier = Modifier.size(100.dp).clip(RoundedCornerShape(12.dp)),
                        ) {
                            AsyncImage(
                                model = imageUrl,
                                contentDescription = "Product image",
                                modifier = Modifier.fillMaxSize(),
                                contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                            )
                            // Small dismiss badge in top-right corner
                            Box(
                                modifier =
                                    Modifier
                                        .align(Alignment.TopEnd)
                                        .padding(4.dp)
                                        .size(20.dp)
                                        .background(Color.Black.copy(alpha = 0.55f), shape = RoundedCornerShape(10.dp))
                                        .clickable { onRemoveImageAt(index) },
                                contentAlignment = Alignment.Center,
                            ) {
                                Text("✕", color = Color.White, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }

            // Add Image Button
            Button(
                onClick = onAddImage,
                enabled = !isUploadingImage,
                modifier = Modifier.fillMaxWidth(),
                shape = SellerUiTokens.radiusButton,
                colors = ButtonDefaults.buttonColors(containerColor = accent),
            ) {
                if (isUploadingImage) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                } else {
                    Text("+ Add Image", color = Color.White)
                }
            }

            Text(
                if (isUploadingImage) "Uploading image..." else "Images: ${imageUrls.size} selected",
                color = if (imageUrls.isEmpty()) Color.Red else muted,
                style = MaterialTheme.typography.labelSmall,
            )
        }
    }
}

@Composable
private fun ProductOnboardingPricingStep(
    price: String,
    onPriceChange: (String) -> Unit,
    stock: String,
    onStockChange: (String) -> Unit,
    selectedSizes: Set<String>,
    onToggleSize: (String) -> Unit,
    sku: String,
    onSkuChange: (String) -> Unit,
    tags: List<String>,
    newTag: String,
    onNewTagChange: (String) -> Unit,
    onAddTag: () -> Unit,
    onRemoveTag: (String) -> Unit,
    bargainEnabled: Boolean,
    onBargainEnabledChange: (Boolean) -> Unit,
    surface: Color,
    text: Color,
    accent: Color,
) {
    Surface(
        color = surface,
        shape = SellerUiTokens.radiusInnerCard,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.padding(SellerUiTokens.cardPadding),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text("Price (₹)", color = text, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodySmall)
            OutlinedTextField(
                value = price,
                onValueChange = onPriceChange,
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("e.g., 499") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            )

            Text("Stock Quantity", color = text, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodySmall)
            OutlinedTextField(
                value = stock,
                onValueChange = onStockChange,
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("e.g., 10") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            )

            Text("Available Sizes (Optional)", color = text, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodySmall)
            Text(
                "Select all sizes currently in stock. Leave empty for free-size products.",
                color = text.copy(alpha = 0.65f),
                style = MaterialTheme.typography.labelSmall,
            )
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                PRODUCT_SIZES.chunked(4).forEach { rowSizes ->
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        rowSizes.forEach { size ->
                            val isSelected = selectedSizes.contains(size)
                            Surface(
                                modifier = Modifier.clickable { onToggleSize(size) },
                                color = if (isSelected) accent.copy(alpha = 0.16f) else Color.Transparent,
                                shape = RoundedCornerShape(12.dp),
                                border =
                                    androidx.compose.foundation.BorderStroke(
                                        1.dp,
                                        if (isSelected) accent else Color(0xFFD4C4B8),
                                    ),
                            ) {
                                Text(
                                    size,
                                    color = if (isSelected) accent else text,
                                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                        }
                    }
                }
            }

            Text("SKU (Optional)", color = text, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodySmall)
            OutlinedTextField(
                value = sku,
                onValueChange = onSkuChange,
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Stock Keeping Unit") },
                singleLine = true,
            )

            Text("Tags (Optional)", color = text, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodySmall)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                OutlinedTextField(
                    value = newTag,
                    onValueChange = onNewTagChange,
                    modifier = Modifier.weight(1f),
                    placeholder = { Text("Add tag...") },
                    singleLine = true,
                )
                Button(
                    onClick = onAddTag,
                    shape = SellerUiTokens.radiusButton,
                    colors = ButtonDefaults.buttonColors(containerColor = accent),
                    modifier = Modifier.align(Alignment.CenterVertically),
                ) {
                    Text("Add", color = Color.White)
                }
            }

            if (tags.isNotEmpty()) {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    items(tags) { tag ->
                        Surface(
                            color = accent.copy(alpha = 0.2f),
                            shape = RoundedCornerShape(20.dp),
                            modifier = Modifier.clickable { onRemoveTag(tag) },
                        ) {
                            Text(
                                "$tag ✕",
                                color = accent,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                style = MaterialTheme.typography.labelSmall,
                            )
                        }
                    }
                }
            }

            // Bargain toggle
            Surface(color = accent.copy(alpha = 0.08f), shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Enable Bargain", color = text, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium)
                        Text(
                            "Buyers can place bids on this product",
                            color = text.copy(alpha = 0.6f),
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                    Switch(checked = bargainEnabled, onCheckedChange = onBargainEnabledChange)
                }
            }
        }
    }
}

@Composable
private fun ProductOnboardingReviewStep(
    title: String,
    description: String,
    category: String,
    region: String,
    price: String,
    stock: String,
    sizes: List<String>,
    imageUrl: String?,
    tags: List<String>,
    surface: Color,
    text: Color,
    muted: Color,
) {
    Surface(
        color = surface,
        shape = SellerUiTokens.radiusInnerCard,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.padding(SellerUiTokens.cardPadding),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text("Review Your Product", color = text, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)

            if (imageUrl != null) {
                AsyncImage(
                    model = imageUrl,
                    contentDescription = "Product image",
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .height(200.dp)
                            .clip(RoundedCornerShape(12.dp)),
                    contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                )
            }

            ReviewItemRow("Title", title, text, muted)
            ReviewItemRow("Category", category, text, muted)
            ReviewItemRow("Region", region, text, muted)
            ReviewItemRow("Price", "₹$price", text, muted)
            ReviewItemRow("Stock", "$stock units", text, muted)
            ReviewItemRow("Available Sizes", if (sizes.isEmpty()) "Free Size" else sizes.joinToString(", "), text, muted)

            Text("Description", color = text, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelMedium)
            Text(description, color = muted, style = MaterialTheme.typography.bodySmall)

            if (tags.isNotEmpty()) {
                Text("Tags", color = text, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelMedium)
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(tags) { tag ->
                        Surface(
                            color = NotWhatAuthTokens.accent.copy(alpha = 0.2f),
                            shape = RoundedCornerShape(20.dp),
                        ) {
                            Text(
                                tag,
                                color = NotWhatAuthTokens.accent,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                style = MaterialTheme.typography.labelSmall,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ReviewItemRow(
    label: String,
    value: String,
    text: Color,
    muted: Color,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(label, color = muted, style = MaterialTheme.typography.labelSmall)
        Text(value, color = text, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelSmall)
    }
}

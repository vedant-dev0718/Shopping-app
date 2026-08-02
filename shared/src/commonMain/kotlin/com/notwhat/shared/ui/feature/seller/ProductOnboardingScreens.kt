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
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage

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
    var sku by remember { mutableStateOf("") }
    var productLink by remember { mutableStateOf("") }
    var tags by remember { mutableStateOf(listOf<String>()) }
    var newTag by remember { mutableStateOf("") }
    var imageUrls by remember { mutableStateOf(listOf<String>()) }
    var isLoading by remember { mutableStateOf(false) }

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
                            imageUrls = imageUrls,
                            onImagesChange = { imageUrls = it },
                            surface = surface,
                            text = text,
                            muted = muted,
                            accent = accent,
                        )
                    }

                    2 -> {
                        ProductOnboardingPricingStep(
                            price = price,
                            onPriceChange = { price = it },
                            stock = stock,
                            onStockChange = { stock = it },
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
                            surface = surface,
                            text = text,
                            muted = muted,
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
                            imageUrl = imageUrls.firstOrNull(),
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
                        // Submit
                        isLoading = true
                        // In a real implementation, call the SellerUseCase.createProduct here
                        // For now, simulate with a delay
                        onProductCreated()
                    }
                },
                modifier = Modifier.weight(if (currentStep == 0) 1f else 1f),
                enabled = isStepValid && !isLoading,
                shape = SellerUiTokens.radiusButton,
                colors = ButtonDefaults.buttonColors(containerColor = accent),
            ) {
                if (isLoading) {
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
    val accent = NotWhatAuthTokens.accent

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
                accent = accent,
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
                accent = accent,
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
    accent: Color,
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
    accent: Color,
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
    onImagesChange: (List<String>) -> Unit,
    surface: Color,
    text: Color,
    muted: Color,
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
                    items(imageUrls) { imageUrl ->
                        Box(
                            modifier =
                                Modifier
                                    .size(100.dp)
                                    .clip(RoundedCornerShape(8.dp)),
                        ) {
                            AsyncImage(
                                model = imageUrl,
                                contentDescription = "Product image",
                                modifier = Modifier.fillMaxSize(),
                                contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                            )
                            // Remove button
                            Box(
                                modifier =
                                    Modifier
                                        .align(Alignment.TopEnd)
                                        .background(Color.Red, shape = RoundedCornerShape(50.dp))
                                        .clickable { onImagesChange(imageUrls.filter { it != imageUrl }) }
                                        .padding(4.dp),
                            ) {
                                Text("✕", color = Color.White, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }

            // Add Image Button (placeholder for actual image picker)
            Button(
                onClick = {
                    // In a real app, this would open the image picker
                    // For now, add a placeholder image URL
                    val sampleUrls =
                        listOf(
                            "https://images.unsplash.com/photo-1596703463905-5e70e3f1b2b3",
                            "https://images.unsplash.com/photo-1571115764595-644a1f80121c",
                        )
                    onImagesChange(imageUrls + sampleUrls.random())
                },
                modifier = Modifier.fillMaxWidth(),
                shape = SellerUiTokens.radiusButton,
                colors = ButtonDefaults.buttonColors(containerColor = accent),
            ) {
                Text("+ Add Image", color = Color.White)
            }

            Text(
                "Images: ${imageUrls.size} selected",
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
    sku: String,
    onSkuChange: (String) -> Unit,
    tags: List<String>,
    newTag: String,
    onNewTagChange: (String) -> Unit,
    onAddTag: () -> Unit,
    onRemoveTag: (String) -> Unit,
    surface: Color,
    text: Color,
    muted: Color,
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

package com.notwhat.shared.ui

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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.notwhat.shared.address.AddressRequestDto
import com.notwhat.shared.core.NetworkResult
import kotlinx.coroutines.launch

internal enum class ProfileShellRoute {
    ProfileAddress,
    AddressOnly,
    SettingsHelp,
    ContactSupport,
    PrivacyPolicy,
    AboutNotWhat,
}

@Composable
internal fun ProfileShellScreen(
    modifier: Modifier,
    state: NotWhatAppState,
    route: ProfileShellRoute,
    onBackToAccount: () -> Unit,
    onRouteChange: (ProfileShellRoute) -> Unit,
    onSignOut: () -> Unit = {},
) {
    when (route) {
        ProfileShellRoute.ProfileAddress -> {
            ProfileAddressManagementScreen(
                modifier = modifier,
                state = state,
                onBack = onBackToAccount,
                onOpenSupport = { onRouteChange(ProfileShellRoute.ContactSupport) },
                onOpenPrivacy = { onRouteChange(ProfileShellRoute.PrivacyPolicy) },
                onOpenAbout = { onRouteChange(ProfileShellRoute.AboutNotWhat) },
            )
        }

        ProfileShellRoute.AddressOnly -> {
            AddressesOnlyScreen(
                modifier = modifier,
                appState = state,
                onBack = onBackToAccount,
            )
        }

        ProfileShellRoute.SettingsHelp -> {
            SettingsHelpCenterScreen(
                modifier = modifier,
                state = state,
                onBack = { onRouteChange(ProfileShellRoute.ProfileAddress) },
                onOpenSupport = { onRouteChange(ProfileShellRoute.ContactSupport) },
                onOpenPrivacy = { onRouteChange(ProfileShellRoute.PrivacyPolicy) },
                onOpenAbout = { onRouteChange(ProfileShellRoute.AboutNotWhat) },
                onSignOut = onSignOut,
            )
        }

        ProfileShellRoute.ContactSupport -> {
            ContactSupportScreen(
                modifier = modifier,
                onBack = { onRouteChange(ProfileShellRoute.SettingsHelp) },
            )
        }

        ProfileShellRoute.PrivacyPolicy -> {
            PrivacyPolicyScreen(
                modifier = modifier,
                onBack = { onRouteChange(ProfileShellRoute.SettingsHelp) },
            )
        }

        ProfileShellRoute.AboutNotWhat -> {
            AboutNotWhatScreen(
                modifier = modifier,
                onBack = { onRouteChange(ProfileShellRoute.SettingsHelp) },
            )
        }
    }
}

@Composable
private fun ProfileAddressManagementScreen(
    modifier: Modifier,
    state: NotWhatAppState,
    onBack: () -> Unit,
    onOpenSupport: () -> Unit,
    onOpenPrivacy: () -> Unit,
    onOpenAbout: () -> Unit,
) {
    val bg = NotWhatColors.background
    val surface = NotWhatColors.surface
    val text = NotWhatColors.onSurface
    val accent = NotWhatAuthTokens.accent
    val profileName = state.currentSession?.name ?: "NotWhat User"

    LazyColumn(
        modifier = modifier.fillMaxSize().background(bg),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                TextButton(onClick = onBack) { Text("Back", color = accent) }
                Text("Profile", color = text, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                Spacer(modifier = Modifier.width(56.dp))
            }
        }

        item {
            Surface(color = surface, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    ProfileImage(
                        url = "",
                        contentDescription = profileName,
                        modifier = Modifier.size(80.dp),
                        shape = RoundedCornerShape(40.dp),
                    )
                    Text(profileName, color = text, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                }
            }
        }

        item {
            Surface(color = surface, shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                Column {
                    ProfileActionTile(
                        title = "Contact Support",
                        subtitle = "Raise ticket, chat, or call support",
                        onClick = onOpenSupport,
                        accent = accent,
                    )
                    HorizontalDivider(color = Color.White.copy(alpha = 0.1f))
                    ProfileActionTile(
                        title = "Privacy Policy",
                        subtitle = "How we use your data",
                        onClick = onOpenPrivacy,
                        accent = accent,
                    )
                    HorizontalDivider(color = Color.White.copy(alpha = 0.1f))
                    ProfileActionTile(
                        title = "About NotWhat",
                        subtitle = "Vision, version, and legal info",
                        onClick = onOpenAbout,
                        accent = accent,
                    )
                }
            }
        }
    }
}

@Composable
private fun AddressesOnlyScreen(
    modifier: Modifier,
    appState: NotWhatAppState,
    onBack: () -> Unit,
) {
    val bg = NotWhatColors.background
    val surface = NotWhatColors.surface
    val surfaceHigh = NotWhatColors.surfaceContainerHigh
    val text = NotWhatColors.onSurface
    val muted = NotWhatColors.onSurfaceVariant
    val accent = NotWhatAuthTokens.accent
    val scope = rememberCoroutineScope()
    val sessionToken = appState.currentSession?.authToken

    var showAddForm by remember { mutableStateOf(false) }
    var editingAddressId by remember { mutableStateOf<String?>(null) }
    var pendingDeleteAddress by remember { mutableStateOf<com.notwhat.shared.address.AddressDto?>(null) }
    var newLabel by remember { mutableStateOf("Other") }
    var newName by remember { mutableStateOf(appState.currentSession?.name ?: "") }
    var newPhone by remember { mutableStateOf("+91 ") }
    var newLine1 by remember { mutableStateOf("") }
    var newLine2 by remember { mutableStateOf("") }
    var newCity by remember { mutableStateOf("") }
    var newRegionState by remember { mutableStateOf("") }
    var newPinCode by remember { mutableStateOf("") }
    var formErrorMessage by remember { mutableStateOf<String?>(null) }
    var showFieldValidation by remember { mutableStateOf(false) }

    val addresses = appState.transaction.addresses
    val phoneDigits =
        newPhone.filter { it.isDigit() }.let { digits ->
            if (digits.startsWith("91") &&
                digits.length > 10
            ) {
                digits.removePrefix("91")
            } else {
                digits
            }
        }
    val phoneErrorMessage =
        if (showFieldValidation && !Regex("^[6-9]\\d{9}$").matches(phoneDigits)) {
            "Phone must be a valid Indian mobile number."
        } else {
            null
        }
    val pinErrorMessage =
        if (showFieldValidation && !Regex("^[1-9]\\d{5}$").matches(newPinCode)) {
            "PIN must be 6 digits."
        } else {
            null
        }

    fun resetForm() {
        editingAddressId = null
        newLabel = "Other"
        newName = appState.currentSession?.name ?: ""
        newPhone = "+91 "
        newLine1 = ""
        newLine2 = ""
        newCity = ""
        newRegionState = ""
        newPinCode = ""
        formErrorMessage = null
        showFieldValidation = false
    }

    fun populateForm(address: com.notwhat.shared.address.AddressDto) {
        editingAddressId = address.id
        newLabel = address.type.replaceFirstChar { it.uppercaseChar() }
        newName = address.fullName
        newPhone = address.phone
        newLine1 = address.addressLine1
        newLine2 = address.addressLine2.orEmpty()
        newCity = address.city
        newRegionState = address.state
        newPinCode = address.pincode
        formErrorMessage = null
        showFieldValidation = false
    }

    LaunchedEffect(sessionToken) {
        if (!sessionToken.isNullOrBlank()) {
            appState.transaction.loadAddresses(sessionToken)
        }
    }

    Box(modifier = modifier.fillMaxSize().background(bg)) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    TextButton(onClick = onBack) { Text("Back", color = accent) }
                    Text("Addresses", color = text, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                    TextButton(onClick = {
                        resetForm()
                        showAddForm = true
                    }) { Text("Add", color = accent) }
                }
            }

            if (addresses.isEmpty()) {
                item {
                    Box(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 48.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("No address added", style = MaterialTheme.typography.titleMedium, color = muted)
                            Text("Tap Add to save a delivery address", color = muted, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }

            items(addresses) { address ->
                Surface(color = surface, shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                                Surface(
                                    color = if (address.isDefault) accent.copy(alpha = 0.2f) else surfaceHigh,
                                    shape = RoundedCornerShape(8.dp),
                                ) {
                                    Text(
                                        address.type.replaceFirstChar { it.uppercaseChar() },
                                        color = if (address.isDefault) accent else text,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                        style = MaterialTheme.typography.labelSmall,
                                    )
                                }
                                if (address.isDefault) {
                                    Text(
                                        "Default",
                                        color = accent,
                                        style = MaterialTheme.typography.labelSmall,
                                        fontWeight = FontWeight.Bold,
                                    )
                                }
                            }
                            if (!address.isDefault) {
                                TextButton(onClick = {
                                    val token = sessionToken ?: return@TextButton
                                    scope.launch {
                                        appState.transaction.setDefaultDeliveryAddress(address.id, token)
                                    }
                                }) {
                                    Text("Set Default", color = accent)
                                }
                            }
                        }
                        Text(address.fullName, color = text, fontWeight = FontWeight.SemiBold)
                        Text(address.addressLine1, color = muted, style = MaterialTheme.typography.bodySmall)
                        address.addressLine2?.let { Text(it, color = muted, style = MaterialTheme.typography.bodySmall) }
                        Text(
                            "${address.city}, ${address.state} ${address.pincode}",
                            color = muted,
                            style = MaterialTheme.typography.bodySmall,
                        )
                        Text(address.phone, color = accent, style = MaterialTheme.typography.labelMedium)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                            TextButton(onClick = {
                                populateForm(address)
                                showAddForm = true
                            }) {
                                Text("Edit", color = accent)
                            }
                            TextButton(onClick = {
                                pendingDeleteAddress = address
                            }) {
                                Text("Delete", color = Color(0xFFFFB4AB))
                            }
                        }
                        if (appState.transaction.selectedDeliveryAddressId == address.id) {
                            Text(
                                "Selected for checkout",
                                color = accent,
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                            )
                        } else {
                            TextButton(
                                onClick = { appState.transaction.selectDeliveryAddress(address.id) },
                            ) {
                                Text("Use This Address", color = accent)
                            }
                        }
                    }
                }
            }

            appState.transaction.addressesErrorMessage?.let { errorMessage ->
                item {
                    Text(errorMessage, color = Color(0xFFFFB4AB), style = MaterialTheme.typography.bodySmall)
                }
            }
        }

        if (showAddForm) {
            Box(
                modifier =
                    Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.68f)).clickable {
                        showAddForm = false
                        resetForm()
                    },
            )
            Surface(
                modifier = Modifier.align(Alignment.BottomCenter).fillMaxWidth().height(560.dp),
                color = bg.copy(alpha = 0.98f),
                shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
            ) {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                if (editingAddressId == null) "Add Address" else "Edit Address",
                                color = text,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                            )
                            TextButton(onClick = {
                                showAddForm = false
                                resetForm()
                            }) { Text("Close", color = accent) }
                        }
                    }
                    item {
                        OutlinedTextField(
                            value = newName,
                            onValueChange = { newName = it },
                            label = { Text("Full Name") },
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                    item {
                        OutlinedTextField(
                            value = newPhone,
                            onValueChange = { value ->
                                newPhone = value.filter { it.isDigit() || it == '+' || it == ' ' }.take(14)
                            },
                            label = { Text("Phone") },
                            modifier = Modifier.fillMaxWidth(),
                            isError = phoneErrorMessage != null,
                            supportingText = {
                                phoneErrorMessage?.let { message ->
                                    Text(message, color = Color(0xFFFFB4AB), style = MaterialTheme.typography.bodySmall)
                                }
                            },
                        )
                    }
                    item {
                        OutlinedTextField(value = newLine1, onValueChange = {
                            newLine1 = it
                        }, label = { Text("Address Line 1") }, modifier = Modifier.fillMaxWidth())
                    }
                    item {
                        OutlinedTextField(value = newLine2, onValueChange = {
                            newLine2 = it
                        }, label = { Text("Address Line 2") }, modifier = Modifier.fillMaxWidth())
                    }
                    item {
                        OutlinedTextField(
                            value = newCity,
                            onValueChange = { newCity = it },
                            label = { Text("City") },
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                    item {
                        OutlinedTextField(
                            value = newRegionState,
                            onValueChange = { newRegionState = it },
                            label = { Text("State") },
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                    item {
                        OutlinedTextField(
                            value = newPinCode,
                            onValueChange = { value -> newPinCode = value.filter { it.isDigit() }.take(6) },
                            label = { Text("PIN Code") },
                            modifier = Modifier.fillMaxWidth(),
                            isError = pinErrorMessage != null,
                            supportingText = {
                                pinErrorMessage?.let { message ->
                                    Text(message, color = Color(0xFFFFB4AB), style = MaterialTheme.typography.bodySmall)
                                }
                            },
                        )
                    }
                    item {
                        Text("Type", color = muted, style = MaterialTheme.typography.labelSmall)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            listOf("Home", "Work", "Other").forEach { type ->
                                val active = newLabel == type
                                Surface(
                                    modifier = Modifier.clickable { newLabel = type },
                                    shape = RoundedCornerShape(12.dp),
                                    color = if (active) accent.copy(alpha = 0.2f) else surface,
                                    border = androidx.compose.foundation.BorderStroke(1.dp, if (active) accent else NotWhatColors.outline),
                                ) {
                                    Text(
                                        type,
                                        color = if (active) accent else text,
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                        style = MaterialTheme.typography.labelSmall,
                                    )
                                }
                            }
                        }
                    }
                    formErrorMessage?.let { message ->
                        item {
                            Text(message, color = Color(0xFFFFB4AB), style = MaterialTheme.typography.bodySmall)
                        }
                    }
                    item {
                        Button(
                            onClick = {
                                val token = sessionToken
                                if (token.isNullOrBlank()) {
                                    formErrorMessage = "Sign in again to manage delivery addresses."
                                    return@Button
                                }

                                showFieldValidation = true

                                if (
                                    newName.isBlank() ||
                                    newLine1.isBlank() ||
                                    newCity.isBlank() ||
                                    newRegionState.isBlank() ||
                                    newPinCode.length != 6
                                ) {
                                    formErrorMessage = "Enter full name, address line 1, city, and state."
                                    return@Button
                                }

                                if (phoneErrorMessage != null || pinErrorMessage != null) {
                                    formErrorMessage = null
                                    return@Button
                                }

                                formErrorMessage = null
                                scope.launch {
                                    val request =
                                        AddressRequestDto(
                                            fullName = newName.trim(),
                                            phone = newPhone.trim(),
                                            addressLine1 = newLine1.trim(),
                                            addressLine2 = newLine2.trim().ifBlank { null },
                                            city = newCity.trim(),
                                            state = newRegionState.trim(),
                                            pincode = newPinCode,
                                            type = newLabel.lowercase(),
                                        )
                                    val result =
                                        editingAddressId?.let { addressId ->
                                            appState.transaction.updateDeliveryAddress(
                                                addressId = addressId,
                                                request = request,
                                                bearerToken = token,
                                            )
                                        } ?: appState.transaction.createDeliveryAddress(
                                            request = request,
                                            bearerToken = token,
                                        )
                                    when (result) {
                                        is NetworkResult.Success -> {
                                            resetForm()
                                            showAddForm = false
                                        }

                                        is NetworkResult.Failure -> {
                                            formErrorMessage = appState.transaction.addressesErrorMessage ?: "Unable to save address."
                                        }
                                    }
                                }
                            },
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                            shape = RoundedCornerShape(16.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = accent),
                        ) {
                            Text(
                                if (editingAddressId ==
                                    null
                                ) {
                                    "SAVE ADDRESS"
                                } else {
                                    "UPDATE ADDRESS"
                                },
                                color = Color.White,
                                fontWeight = FontWeight.Black,
                            )
                        }
                    }
                }
            }
        }

        pendingDeleteAddress?.let { address ->
            AlertDialog(
                onDismissRequest = { pendingDeleteAddress = null },
                containerColor = surface,
                title = {
                    Text("Delete address?", color = text, fontWeight = FontWeight.Bold)
                },
                text = {
                    Text(
                        "Remove ${address.fullName}'s address at ${address.addressLine1}? This cannot be undone.",
                        color = muted,
                    )
                },
                confirmButton = {
                    TextButton(onClick = {
                        val token = sessionToken ?: return@TextButton
                        pendingDeleteAddress = null
                        scope.launch {
                            appState.transaction.deleteDeliveryAddress(address.id, token)
                        }
                    }) {
                        Text("Delete Address", color = Color(0xFFFFB4AB), fontWeight = FontWeight.Bold)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { pendingDeleteAddress = null }) {
                        Text("Keep Address", color = accent)
                    }
                },
            )
        }
    }
}

@Composable
private fun SettingsHelpCenterScreen(
    modifier: Modifier,
    state: NotWhatAppState,
    onBack: () -> Unit,
    onOpenSupport: () -> Unit,
    onOpenPrivacy: () -> Unit,
    onOpenAbout: () -> Unit,
    onSignOut: () -> Unit = {},
) {
    val bg = NotWhatColors.background
    val surface = NotWhatColors.surface
    val surfaceHigh = NotWhatColors.surfaceContainerHigh
    val text = NotWhatColors.onSurface
    val muted = NotWhatColors.onSurfaceVariant
    val accent = NotWhatAuthTokens.accent

    var pushEnabled by remember { mutableStateOf(true) }
    var bargainAlertsEnabled by remember { mutableStateOf(true) }
    var darkPreviewEnabled by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = modifier.fillMaxSize().background(bg),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                TextButton(onClick = onBack) { Text("Back", color = accent) }
                Text("Settings", color = text, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                Text(state.currentSession?.role?.title ?: "Buyer", color = muted, style = MaterialTheme.typography.labelSmall)
            }
        }

        item {
            Surface(color = surface, shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Preferences", color = text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    SettingsToggleRow(label = "Push Notifications", subtitle = "Order and offer updates", checked = pushEnabled, onChecked = {
                        pushEnabled =
                            it
                    }, textColor = text, mutedColor = muted)
                    SettingsToggleRow(label = "Bargain Alerts", subtitle = "Live updates on tracked items", checked = bargainAlertsEnabled, onChecked = {
                        bargainAlertsEnabled =
                            it
                    }, textColor = text, mutedColor = muted)
                    SettingsToggleRow(label = "Dark Feed Preview", subtitle = "Use high contrast feed cards", checked = darkPreviewEnabled, onChecked = {
                        darkPreviewEnabled =
                            it
                    }, textColor = text, mutedColor = muted)
                }
            }
        }

        item {
            Surface(color = surface, shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Language & Region", color = text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Surface(color = surfaceHigh, shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column {
                                Text("Preferred language", color = text)
                                Text("English (India)", color = muted, style = MaterialTheme.typography.bodySmall)
                            }
                            Text("Change", color = accent, fontWeight = FontWeight.Bold)
                        }
                    }
                    Surface(color = surfaceHigh, shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column {
                                Text("Region", color = text)
                                Text("Bengaluru", color = muted, style = MaterialTheme.typography.bodySmall)
                            }
                            Text("Edit", color = accent, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        item {
            Surface(color = surface, shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Help Center", color = text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    ProfileActionTile(
                        title = "Contact Support",
                        subtitle = "Report payment, shipping, or app issues",
                        onClick = onOpenSupport,
                        accent = accent,
                    )
                    HorizontalDivider(color = Color.White.copy(alpha = 0.1f))
                    ProfileActionTile(
                        title = "Privacy Policy",
                        subtitle = "Understand data usage and retention",
                        onClick = onOpenPrivacy,
                        accent = accent,
                    )
                    HorizontalDivider(color = Color.White.copy(alpha = 0.1f))
                    ProfileActionTile(
                        title = "About NotWhat",
                        subtitle = "Brand story, version, and legal disclosures",
                        onClick = onOpenAbout,
                        accent = accent,
                    )
                }
            }
        }

        item {
            Surface(
                modifier = Modifier.fillMaxWidth().clickable { onSignOut() },
                shape = RoundedCornerShape(14.dp),
                color = NotWhatColors.surfaceContainerHigh,
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("Sign Out", fontWeight = FontWeight.Bold, color = NotWhatColors.primary)
                    Text("Leave", color = NotWhatColors.primary, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun ContactSupportScreen(
    modifier: Modifier,
    onBack: () -> Unit,
) {
    val bg = NotWhatColors.background
    val surface = NotWhatColors.surface
    val text = NotWhatColors.onSurface
    val muted = NotWhatColors.onSurfaceVariant
    val accent = NotWhatAuthTokens.accent

    val topics = listOf("Order delayed", "Refund pending", "Payment failed", "App issue")
    var selectedTopic by remember { mutableStateOf(topics.first()) }
    var subject by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }
    var submittedMessage by remember { mutableStateOf<String?>(null) }

    LazyColumn(
        modifier = modifier.fillMaxSize().background(bg),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                TextButton(onClick = onBack) { Text("Back", color = accent) }
                Text("Contact Support", color = text, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                Spacer(modifier = Modifier.width(42.dp))
            }
        }

        item {
            Surface(color = surface, shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("How can we help?", color = text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        topics.forEach { topic ->
                            val active = selectedTopic == topic
                            Surface(
                                modifier = Modifier.clickable { selectedTopic = topic },
                                shape = RoundedCornerShape(10.dp),
                                color = if (active) accent.copy(alpha = 0.2f) else Color.Transparent,
                                border = androidx.compose.foundation.BorderStroke(1.dp, if (active) accent else NotWhatColors.outline),
                            ) {
                                Text(
                                    topic,
                                    color = if (active) accent else muted,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                    style = MaterialTheme.typography.labelSmall,
                                )
                            }
                        }
                    }
                    OutlinedTextField(
                        value = subject,
                        onValueChange = { subject = it },
                        label = { Text("Subject") },
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OutlinedTextField(
                        value = message,
                        onValueChange = { message = it },
                        label = { Text("Describe the issue") },
                        modifier = Modifier.fillMaxWidth().height(140.dp),
                    )
                    Button(
                        onClick = {
                            if (subject.isNotBlank() && message.isNotBlank()) {
                                submittedMessage = "Ticket created for '$selectedTopic'. Support will respond in 24h."
                                subject = ""
                                message = ""
                            }
                        },
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = accent),
                    ) {
                        Text("SUBMIT REQUEST", color = Color.White, fontWeight = FontWeight.Black)
                    }
                    submittedMessage?.let {
                        Text(it, color = accent, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }

        item {
            Surface(color = surface, shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Other support channels", color = text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text("Email: support@notwhat.in", color = muted)
                    Text("Phone: +91 80 4444 2020", color = muted)
                    Text("Hours: 9 AM - 9 PM IST", color = muted)
                }
            }
        }
    }
}

@Composable
private fun PrivacyPolicyScreen(
    modifier: Modifier,
    onBack: () -> Unit,
) {
    val bg = NotWhatColors.background
    val surface = NotWhatColors.surface
    val text = NotWhatColors.onSurface
    val muted = NotWhatColors.onSurfaceVariant
    val accent = NotWhatAuthTokens.accent

    val policyPoints =
        listOf(
            "We collect profile, address, and order data only to complete purchases and delivery.",
            "Payment credentials are tokenized by gateway partners; full card numbers are never stored in app state.",
            "You can request account deletion and export from support within app settings.",
            "Notification preferences can be managed anytime from Settings.",
        )

    LazyColumn(
        modifier = modifier.fillMaxSize().background(bg),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                TextButton(onClick = onBack) { Text("Back", color = accent) }
                Text("Privacy Policy", color = text, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                Spacer(modifier = Modifier.width(42.dp))
            }
        }

        item {
            Surface(color = surface, shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Your privacy matters", color = text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    policyPoints.forEachIndexed { index, point ->
                        Text("${index + 1}. $point", color = muted)
                    }
                    Text("Last updated: 20 Jul 2026", color = accent, style = MaterialTheme.typography.labelSmall)
                }
            }
        }
    }
}

@Composable
private fun AboutNotWhatScreen(
    modifier: Modifier,
    onBack: () -> Unit,
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
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                TextButton(onClick = onBack) { Text("Back", color = accent) }
                Text("About NotWhat", color = text, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                Spacer(modifier = Modifier.width(42.dp))
            }
        }

        item {
            Surface(color = surface, shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        "Regional fashion, social-first commerce",
                        color = text,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        "NotWhat helps buyers discover shoppable reels and bargain directly with local sellers across India.",
                        color = muted,
                    )
                    Text("Version: 0.5.0-migration", color = accent, style = MaterialTheme.typography.labelSmall)
                }
            }
        }

        item {
            Surface(color = surface, shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Company", color = text, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                    Text("Headquarters: Bengaluru, Karnataka", color = muted)
                    Text("Legal: support@notwhat.in", color = muted)
                    Text("Website: www.notwhat.in", color = muted)
                }
            }
        }
    }
}

@Composable
private fun ProfileActionTile(
    title: String,
    subtitle: String,
    onClick: () -> Unit,
    accent: Color,
) {
    Row(
        modifier = Modifier.fillMaxWidth().clickable { onClick() }.padding(vertical = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(title, color = NotWhatColors.onSurface, fontWeight = FontWeight.Bold)
            Text(subtitle, color = NotWhatColors.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
        }
        Text("›", color = accent, style = MaterialTheme.typography.titleLarge)
    }
}

@Composable
private fun SettingsToggleRow(
    label: String,
    subtitle: String,
    checked: Boolean,
    onChecked: (Boolean) -> Unit,
    textColor: Color,
    mutedColor: Color,
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(10.dp),
        color = Color.Transparent,
        border = androidx.compose.foundation.BorderStroke(1.dp, NotWhatColors.outline.copy(alpha = 0.5f)),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(label, color = textColor, fontWeight = FontWeight.SemiBold)
                Text(subtitle, color = mutedColor, style = MaterialTheme.typography.bodySmall)
            }
            Switch(checked = checked, onCheckedChange = onChecked)
        }
    }
}

@Composable
private fun ProfileImage(
    url: String,
    contentDescription: String,
    modifier: Modifier,
    shape: RoundedCornerShape,
) {
    if (url.isBlank()) {
        val initials =
            contentDescription
                .split(" ")
                .mapNotNull { it.firstOrNull()?.uppercaseChar() }
                .take(2)
                .joinToString("")
        Box(modifier = modifier.clip(shape).background(NotWhatAuthTokens.accent.copy(alpha = 0.2f)), contentAlignment = Alignment.Center) {
            Text(
                initials.ifEmpty { "?" },
                fontWeight = FontWeight.Bold,
                color = NotWhatAuthTokens.accent,
                style = MaterialTheme.typography.titleLarge,
            )
        }
    } else {
        AsyncImage(
            model = url,
            contentDescription = contentDescription,
            modifier = modifier.clip(shape),
            contentScale = ContentScale.Crop,
        )
    }
}

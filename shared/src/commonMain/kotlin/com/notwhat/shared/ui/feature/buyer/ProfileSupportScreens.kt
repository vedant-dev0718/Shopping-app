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
import kotlinx.coroutines.launch

internal enum class ProfileShellRoute {
    ProfileAddress,
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
) {
    when (route) {
        ProfileShellRoute.ProfileAddress -> {
            ProfileAddressManagementScreen(
                modifier = modifier,
                state = state,
                onBack = onBackToAccount,
                onOpenSettings = { onRouteChange(ProfileShellRoute.SettingsHelp) },
                onOpenSupport = { onRouteChange(ProfileShellRoute.ContactSupport) },
                onOpenPrivacy = { onRouteChange(ProfileShellRoute.PrivacyPolicy) },
                onOpenAbout = { onRouteChange(ProfileShellRoute.AboutNotWhat) },
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
    onOpenSettings: () -> Unit,
    onOpenSupport: () -> Unit,
    onOpenPrivacy: () -> Unit,
    onOpenAbout: () -> Unit,
) {
    val bg = NotWhatColors.background
    val surface = NotWhatColors.surface
    val surfaceHigh = NotWhatColors.surfaceContainerHigh
    val text = NotWhatColors.onSurface
    val muted = NotWhatColors.onSurfaceVariant
    val accent = NotWhatAuthTokens.accent
    val scope = rememberCoroutineScope()
    val ordersErrorMessage = state.transaction.ordersErrorMessage
    val addressesErrorMessage = state.transaction.addressesErrorMessage
    val sessionToken = state.currentSession?.authToken

    var addresses by remember(state.transaction.addresses) {
        mutableStateOf(
            state.transaction.addresses,
        )
    }
    var showAddForm by remember { mutableStateOf(false) }
    var newLabel by remember { mutableStateOf("Other") }
    var newName by remember { mutableStateOf(state.currentSession?.name ?: "") }
    var newPhone by remember { mutableStateOf("+91 ") }
    var newLine1 by remember { mutableStateOf("") }
    var newLine2 by remember { mutableStateOf("") }
    var newCityPin by remember { mutableStateOf("") }

    val stats =
        DemoProfileStats(
            orders =
                state.transaction.orders.size
                    .toString(),
            saved = "—",
            reviews = "—",
            following = "—",
        )
    val profileName = state.currentSession?.name ?: "Arjun Sharma"

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
                    Text("Profile", color = text, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                    TextButton(onClick = { showAddForm = true }) { Text("Add Address", color = accent) }
                }
            }

            if (!ordersErrorMessage.isNullOrBlank()) {
                item {
                    Surface(color = surfaceHigh, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("Orders unavailable", color = text, fontWeight = FontWeight.Bold)
                            Text(ordersErrorMessage, color = muted, style = MaterialTheme.typography.bodySmall)
                            TextButton(
                                onClick = {
                                    val token = sessionToken ?: return@TextButton
                                    scope.launch { state.transaction.loadOrders(token) }
                                },
                            ) {
                                Text("Retry orders fetch", color = accent)
                            }
                        }
                    }
                }
            }

            if (!addressesErrorMessage.isNullOrBlank()) {
                item {
                    Surface(color = surfaceHigh, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("Addresses unavailable", color = text, fontWeight = FontWeight.Bold)
                            Text(addressesErrorMessage, color = muted, style = MaterialTheme.typography.bodySmall)
                            TextButton(
                                onClick = {
                                    val token = sessionToken ?: return@TextButton
                                    scope.launch { state.transaction.loadAddresses(token) }
                                },
                            ) {
                                Text("Retry address fetch", color = accent)
                            }
                        }
                    }
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
                            modifier = Modifier.size(96.dp),
                            shape = RoundedCornerShape(48.dp),
                        )
                        Text(profileName, color = text, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                        Text("@arjun_vibe", color = accent, style = MaterialTheme.typography.labelMedium)
                        Text(
                            "Hunting for the rarest street drops. Bargain king.",
                            color = muted,
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                }
            }

            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    listOf(
                        "Orders" to stats.orders,
                        "Saved" to stats.saved,
                        "Reviews" to stats.reviews,
                        "Following" to stats.following,
                    ).forEach { (label, value) ->
                        Surface(color = surface, shape = RoundedCornerShape(12.dp), modifier = Modifier.weight(1f)) {
                            Column(modifier = Modifier.padding(vertical = 12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(value, color = accent, fontWeight = FontWeight.Black)
                                Text(label, color = muted, style = MaterialTheme.typography.labelSmall)
                            }
                        }
                    }
                }
            }

            item {
                Surface(color = surface, shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        ProfileActionTile(
                            title = "Settings & Help Center",
                            subtitle = "Notifications, language, FAQ, and help",
                            onClick = onOpenSettings,
                            accent = accent,
                        )
                        HorizontalDivider(color = Color.White.copy(alpha = 0.1f))
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

            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("My Addresses", color = text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text("${addresses.size} saved", color = muted, style = MaterialTheme.typography.labelSmall)
                }
            }

            items(addresses.indices.toList()) { index ->
                val address = addresses[index]
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
                                        address.type.replaceFirstChar {
                                            it.uppercaseChar()
                                        },
                                        color = if (address.isDefault) accent else text,
                                        modifier =
                                            Modifier.padding(
                                                horizontal = 8.dp,
                                                vertical = 4.dp,
                                            ),
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
                                    addresses = addresses.mapIndexed { idx, item -> item.copy(isDefault = idx == index) }
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
                    }
                }
            }
        }

        if (showAddForm) {
            Box(
                modifier =
                    Modifier
                        .fillMaxSize()
                        .background(Color.Black.copy(alpha = 0.68f))
                        .clickable { showAddForm = false },
            )
            Surface(
                modifier =
                    Modifier
                        .align(Alignment.BottomCenter)
                        .fillMaxWidth()
                        .height(560.dp),
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
                            Text("Add Address", color = text, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                            TextButton(onClick = { showAddForm = false }) { Text("Close", color = accent) }
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
                            onValueChange = { newPhone = it },
                            label = { Text("Phone") },
                            modifier = Modifier.fillMaxWidth(),
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
                        OutlinedTextField(value = newCityPin, onValueChange = {
                            newCityPin = it
                        }, label = { Text("City, State, PIN") }, modifier = Modifier.fillMaxWidth())
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
                    item {
                        Button(
                            onClick = {
                                if (newName.isNotBlank() && newLine1.isNotBlank() && newCityPin.isNotBlank()) {
                                    addresses = addresses +
                                        com.notwhat.shared.address.AddressDto(
                                            fullName = newName,
                                            phone = newPhone,
                                            addressLine1 = newLine1,
                                            addressLine2 = newLine2.ifBlank { null },
                                            city = newCityPin.substringBefore(",").trim(),
                                            state = newCityPin.substringAfter(",").substringBeforeLast(" ").trim(),
                                            pincode = newCityPin.substringAfterLast(" ").trim(),
                                            type = newLabel.lowercase(),
                                            isDefault = addresses.none { it.isDefault },
                                        )
                                    showAddForm = false
                                    newLabel = "Other"
                                    newName = state.currentSession?.name ?: ""
                                    newPhone = "+91 "
                                    newLine1 = ""
                                    newLine2 = ""
                                    newCityPin = ""
                                }
                            },
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                            shape = RoundedCornerShape(16.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = accent),
                        ) {
                            Text("SAVE ADDRESS", color = Color.White, fontWeight = FontWeight.Black)
                        }
                    }
                }
            }
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
        modifier = Modifier.fillMaxWidth().clickable { onClick() },
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(title, color = NotWhatColors.onSurface, fontWeight = FontWeight.Bold)
            Text(subtitle, color = NotWhatColors.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
        }
        Text("Open", color = accent, fontWeight = FontWeight.Bold)
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
    AsyncImage(
        model = url,
        contentDescription = contentDescription,
        modifier = modifier.clip(shape),
        contentScale = ContentScale.Crop,
    )
}

package com.notwhat.shared.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.notwhat.shared.auth.AuthDestination
import com.notwhat.shared.auth.AuthState
import com.notwhat.shared.auth.PlatformSocialAuthBridge
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

// ── Entry points called by NotWhatApp ────────────────────────────────────────

@Composable
internal fun AuthRootScreen(
    modifier: Modifier,
    state: NotWhatAppState,
) {
    val authState = state.authState

    LaunchedEffect(authState.currentSession) {
        val session = authState.currentSession ?: return@LaunchedEffect
        state.routeAuthenticatedUser(session.role)
    }

    if (authState.destination == AuthDestination.Login) {
        Box(
            modifier =
                modifier
                    .fillMaxSize()
                    .background(NotWhatAuthTokens.background)
                    .padding(16.dp),
            contentAlignment = Alignment.Center,
        ) {
            LoginAuthCard(authState)
        }
    } else {
        LazyColumn(
            modifier =
                modifier
                    .fillMaxSize()
                    .background(NotWhatAuthTokens.background),
            contentPadding =
                androidx.compose.foundation.layout
                    .PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            item {
                when (authState.destination) {
                    AuthDestination.Login -> LoginAuthCard(authState)
                    AuthDestination.BuyerSignup -> BuyerSignupCard(authState)
                    AuthDestination.SellerSignup -> SellerSignupCard(authState)
                    AuthDestination.VerifySignup -> SignupVerificationCard(authState)
                    AuthDestination.ForgotPassword -> ForgotPasswordCard(authState)
                    AuthDestination.ResetPassword -> ResetPasswordCard(authState)
                }
            }
        }
    }
}

@Composable
internal fun SellerProfileSetupRequiredScreen(
    modifier: Modifier,
    authState: AuthState,
) {
    val scope = rememberCoroutineScope()

    Box(
        modifier =
            modifier
                .fillMaxSize()
                .background(NotWhatAuthTokens.background)
                .padding(16.dp),
        contentAlignment = Alignment.TopCenter,
    ) {
        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(14.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            item {
                ElevatedCard(colors = CardDefaults.elevatedCardColors(containerColor = NotWhatAuthTokens.card)) {
                    Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text(
                            "Complete your seller profile",
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold,
                            color = NotWhatAuthTokens.textPrimary,
                        )
                        Text("Finish your storefront details before you start receiving orders.", color = NotWhatAuthTokens.textMuted)

                        AuthTextField(
                            "Store Name",
                            authState.sellerStoreName,
                            { authState.sellerStoreName = it },
                            false,
                            placeholder = "Urban Threads Mumbai",
                        )
                        AuthTextField("Store Category", authState.sellerStoreCategory, {
                            authState.sellerStoreCategory = it
                        }, false, placeholder = "Streetwear & Apparel")
                        AuthTextField("Store Description", authState.sellerStoreDescription, {
                            authState.sellerStoreDescription = it
                        }, false, singleLine = false, placeholder = "Describe your brand vibe and fulfillment speed")
                        AuthTextField("Specialty Region", authState.sellerSpecialtyRegion, {
                            authState.sellerSpecialtyRegion = it
                        }, false, placeholder = "Mumbai Streetwear")
                        AuthTextField(
                            "Phone (optional)",
                            authState.sellerPhone,
                            { authState.sellerPhone = it },
                            false,
                            placeholder = "+91 00000 00000",
                        )
                        AuthTextField(
                            "Locality",
                            authState.sellerLocality,
                            { authState.sellerLocality = it },
                            false,
                            placeholder = "Andheri West",
                        )
                        AuthTextField("City", authState.sellerCity, { authState.sellerCity = it }, false, placeholder = "Mumbai")
                        AuthTextField("State", authState.sellerState, { authState.sellerState = it }, false, placeholder = "Maharashtra")
                        AuthTextField("Pincode", authState.sellerPincode, { authState.sellerPincode = it }, false, placeholder = "400053")
                        AuthTextField("Country", authState.sellerCountry, { authState.sellerCountry = it }, false, placeholder = "India")

                        Button(
                            onClick = { scope.launch { authState.completeSellerProfileSetup() } },
                            enabled = authState.canCompleteSellerProfileSetup,
                            modifier = Modifier.fillMaxWidth().height(54.dp),
                            shape = RoundedCornerShape(28.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = NotWhatAuthTokens.accent),
                        ) {
                            Text(if (authState.isLoading) "Completing setup..." else "Complete setup")
                        }
                        TextButton(onClick = authState::signOut, modifier = Modifier.align(Alignment.CenterHorizontally)) {
                            Text("Sign out", color = NotWhatAuthTokens.textMuted)
                        }
                    }
                }
            }
        }
    }
}

// ── Auth card composables (private — only this file routes to them) ───────────

@Composable
private fun LoginAuthCard(authState: AuthState) {
    val scope = rememberCoroutineScope()
    var showPassword by remember { mutableStateOf(false) }
    var toastVisible by remember { mutableStateOf(false) }
    var toastMessage by remember { mutableStateOf("") }

    // Show toast whenever errorMessage changes
    LaunchedEffect(authState.errorMessage) {
        val msg = authState.errorMessage ?: return@LaunchedEffect
        toastMessage = msg
        toastVisible = true
        delay(4000)
        toastVisible = false
    }

    Box {
        ElevatedCard(colors = CardDefaults.elevatedCardColors(containerColor = NotWhatAuthTokens.card)) {
            Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Text(
                    "Welcome Back",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = NotWhatAuthTokens.textPrimary,
                )
                Text("Sign in to sync your bargains and feed.", color = NotWhatAuthTokens.textMuted)
                // Demo credentials for testing
                Surface(
                    color = NotWhatAuthTokens.accent.copy(alpha = 0.1f),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(
                            "Buyer: buyer@notwhat.test / Test@1234",
                            color = NotWhatAuthTokens.accent,
                            style = MaterialTheme.typography.labelSmall,
                        )
                        Text(
                            "Seller: seller@notwhat.test / Test@1234",
                            color = NotWhatAuthTokens.accent,
                            style = MaterialTheme.typography.labelSmall,
                        )
                    }
                }
                AuthTextField("Email", authState.loginEmail, { authState.loginEmail = it }, false, placeholder = "you@example.com")

                OutlinedTextField(
                    value = authState.loginPassword,
                    onValueChange = { authState.loginPassword = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Password") },
                    placeholder = { Text("••••••••") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
                    trailingIcon = {
                        TextButton(onClick = { showPassword = !showPassword }) {
                            Text(if (showPassword) "HIDE" else "SHOW", color = NotWhatAuthTokens.accent)
                        }
                    },
                    shape = RoundedCornerShape(16.dp),
                    colors =
                        OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = NotWhatAuthTokens.accent,
                            focusedLabelColor = NotWhatAuthTokens.accent,
                            unfocusedBorderColor = NotWhatAuthTokens.border,
                            unfocusedLabelColor = NotWhatAuthTokens.textMuted,
                            focusedContainerColor = NotWhatAuthTokens.field,
                            unfocusedContainerColor = NotWhatAuthTokens.field,
                            focusedTextColor = NotWhatAuthTokens.textPrimary,
                            unfocusedTextColor = NotWhatAuthTokens.textPrimary,
                            focusedPlaceholderColor = NotWhatAuthTokens.textFaint,
                            unfocusedPlaceholderColor = NotWhatAuthTokens.textFaint,
                        ),
                )

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    TextButton(onClick = authState::openForgotPassword) {
                        Text("Forgot Password?", color = NotWhatAuthTokens.accent)
                    }
                }

                Button(
                    onClick = { scope.launch { authState.submitLogin() } },
                    enabled = authState.canLogin,
                    modifier = Modifier.fillMaxWidth().height(54.dp),
                    shape = RoundedCornerShape(28.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = NotWhatAuthTokens.accent),
                ) {
                    Text(if (authState.isLoading) "Signing in..." else "Log In")
                }

                if (PlatformSocialAuthBridge.supportsGoogle || PlatformSocialAuthBridge.supportsApple) {
                    HorizontalDivider(color = NotWhatAuthTokens.border)
                    Text(
                        "OR CONTINUE WITH",
                        modifier = Modifier.align(Alignment.CenterHorizontally),
                        color = NotWhatAuthTokens.textFaint,
                        style = MaterialTheme.typography.labelSmall,
                    )
                    SocialButtons(authState, scope, signUpContext = false)
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("New here?", color = NotWhatAuthTokens.textMuted)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        "Create Account",
                        color = NotWhatAuthTokens.accent,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.clickable(onClick = authState::openBuyerSignup),
                    )
                }
                TextButton(onClick = authState::openSellerSignup, modifier = Modifier.align(Alignment.CenterHorizontally)) {
                    Text("Seller signup", color = NotWhatAuthTokens.accent)
                }
            }
        }

        // Toast overlaid at the bottom of the card
        AnimatedVisibility(
            visible = toastVisible,
            enter = slideInVertically { it } + fadeIn(),
            exit = slideOutVertically { it } + fadeOut(),
            modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 8.dp),
        ) {
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = Color(0xFFB00020),
                modifier =
                    Modifier
                        .padding(horizontal = 16.dp)
                        .clickable { toastVisible = false },
            ) {
                Text(
                    toastMessage,
                    color = Color.White,
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                )
            }
        }
    } // Box
}

@Composable
private fun BuyerSignupCard(authState: AuthState) {
    val scope = rememberCoroutineScope()
    var confirmPassword by remember { mutableStateOf("") }
    var acceptTerms by remember { mutableStateOf(false) }
    var localSignupError by remember { mutableStateOf<String?>(null) }

    fun canProceedBuyerSignup(): Boolean =
        authState.canSubmitBuyerSignup &&
            confirmPassword == authState.buyerPassword &&
            confirmPassword.isNotBlank() &&
            acceptTerms

    ElevatedCard(colors = CardDefaults.elevatedCardColors(containerColor = NotWhatAuthTokens.card)) {
        Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            SignupProgressHeader()
            Text(
                "Join the Culture",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = NotWhatAuthTokens.textPrimary,
            )
            Text("Create your buyer account to start bargaining and shopping the latest drops.", color = NotWhatAuthTokens.textMuted)
            AuthTextField("Full Name", authState.buyerName, { authState.buyerName = it }, false, placeholder = "e.g. Aryan Sharma")
            AuthTextField("Email Address", authState.buyerEmail, { authState.buyerEmail = it }, false, placeholder = "aryan@notwhat.com")
            AuthTextField("Phone Number", authState.buyerPhone, { authState.buyerPhone = it }, false, placeholder = "+91 00000 00000")
            AuthTextField(
                "Delivery Address",
                authState.buyerAddress,
                { authState.buyerAddress = it },
                false,
                singleLine = false,
                placeholder = "Flat / House, Street, Area, City",
            )
            AuthTextField("Password", authState.buyerPassword, { authState.buyerPassword = it }, true, placeholder = "••••••••")
            AuthTextField("Confirm Password", confirmPassword, { confirmPassword = it }, true, placeholder = "••••••••")
            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(checked = acceptTerms, onCheckedChange = { acceptTerms = it })
                Text(
                    "I agree to the Terms of Service and Privacy Policy.",
                    color = NotWhatAuthTokens.textMuted,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
            Button(
                onClick = {
                    localSignupError = null
                    when {
                        confirmPassword != authState.buyerPassword -> {
                            localSignupError = "Passwords do not match."
                        }

                        !acceptTerms -> {
                            localSignupError = "Accept Terms of Service and Privacy Policy to continue."
                        }

                        else -> {
                            scope.launch { authState.submitBuyerSignup() }
                        }
                    }
                },
                enabled = canProceedBuyerSignup(),
                modifier = Modifier.fillMaxWidth().height(54.dp),
                shape = RoundedCornerShape(28.dp),
                colors = ButtonDefaults.buttonColors(containerColor = NotWhatAuthTokens.accent),
            ) {
                Text(if (authState.isLoading) "Creating account..." else "Create Buyer Account")
            }
            localSignupError?.let { Text(it, color = Color(0xFFB42318), style = MaterialTheme.typography.bodySmall) }
            if (PlatformSocialAuthBridge.supportsGoogle || PlatformSocialAuthBridge.supportsApple) {
                HorizontalDivider(color = NotWhatAuthTokens.border)
                Text(
                    "OR CONTINUE WITH",
                    modifier = Modifier.align(Alignment.CenterHorizontally),
                    color = NotWhatAuthTokens.textFaint,
                    style = MaterialTheme.typography.labelSmall,
                )
                SocialButtons(authState, scope, signUpContext = true)
            }
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
                Text("Already have an account?", color = NotWhatAuthTokens.textMuted)
                TextButton(onClick = authState::backToLogin) { Text("Log In", color = NotWhatAuthTokens.accent) }
            }
        }
    }
}

@Composable
private fun SellerSignupCard(authState: AuthState) {
    val scope = rememberCoroutineScope()
    var sellerStep by remember { mutableStateOf(SellerOnboardingStep.StoreInfo) }
    var localStepError by remember { mutableStateOf<String?>(null) }
    var sellerLogoUri by remember { mutableStateOf<String?>(null) }

    fun canProceedStoreInfo(): Boolean =
        authState.sellerStoreName.trim().isNotEmpty() &&
            authState.sellerStoreCategory.trim().isNotEmpty() &&
            authState.sellerStoreDescription.trim().isNotEmpty() &&
            authState.sellerSpecialtyRegion.trim().isNotEmpty()

    fun canProceedBusiness(): Boolean =
        authState.sellerName.trim().isNotEmpty() &&
            authState.sellerEmail.trim().isNotEmpty() &&
            authState.sellerPhone.trim().isNotEmpty() &&
            authState.isSellerPasswordValid &&
            authState.sellerLocality.trim().isNotEmpty() &&
            authState.sellerCity.trim().isNotEmpty() &&
            authState.sellerState.trim().isNotEmpty() &&
            authState.sellerPincode.trim().isNotEmpty() &&
            authState.sellerCountry.trim().isNotEmpty()

    ElevatedCard(colors = CardDefaults.elevatedCardColors(containerColor = NotWhatAuthTokens.card)) {
        Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            SellerSetupProgressHeader(sellerStep)
            Text(
                "Set up your store",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = NotWhatAuthTokens.textPrimary,
            )
            Text("Tell us about your brand. This info will be visible to shoppers.", color = NotWhatAuthTokens.textMuted)

            when (sellerStep) {
                SellerOnboardingStep.StoreInfo -> {
                    StoreLogoPlaceholder(sellerLogoUri) {
                        if (PlatformMediaPicker.isAvailable()) PlatformMediaPicker.launch { uri -> sellerLogoUri = uri }
                    }
                    AuthTextField(
                        "Store Name",
                        authState.sellerStoreName,
                        { authState.sellerStoreName = it },
                        false,
                        placeholder = "Urban Threads Mumbai",
                    )
                    AuthTextField("Store Category", authState.sellerStoreCategory, {
                        authState.sellerStoreCategory = it
                    }, false, placeholder = "Streetwear & Apparel")
                    AuthTextField("Store Description", authState.sellerStoreDescription, {
                        authState.sellerStoreDescription = it
                    }, false, singleLine = false, placeholder = "Describe your brand vibe and delivery speed")
                    AuthTextField("Specialty Region", authState.sellerSpecialtyRegion, {
                        authState.sellerSpecialtyRegion = it
                    }, false, placeholder = "Mumbai Streetwear")
                }

                SellerOnboardingStep.Business -> {
                    AuthTextField(
                        "Full Name",
                        authState.sellerName,
                        { authState.sellerName = it },
                        false,
                        placeholder = "e.g. Arjun Malhotra",
                    )
                    AuthTextField("Email", authState.sellerEmail, { authState.sellerEmail = it }, false, placeholder = "seller@notwhat.com")
                    AuthTextField("Phone", authState.sellerPhone, { authState.sellerPhone = it }, false, placeholder = "+91 98765 43210")
                    AuthTextField("Password", authState.sellerPassword, { authState.sellerPassword = it }, true, placeholder = "••••••••")
                    AuthTextField("Locality", authState.sellerLocality, { authState.sellerLocality = it }, false)
                    AuthTextField("City", authState.sellerCity, { authState.sellerCity = it }, false)
                    AuthTextField("State", authState.sellerState, { authState.sellerState = it }, false)
                    AuthTextField("Pincode", authState.sellerPincode, { authState.sellerPincode = it }, false, placeholder = "560001")
                    AuthTextField("Country", authState.sellerCountry, { authState.sellerCountry = it }, false, placeholder = "India")
                }

                SellerOnboardingStep.Verify -> {
                    Surface(shape = RoundedCornerShape(16.dp), color = NotWhatColors.surfaceContainer, modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(
                                "Verify details",
                                color = NotWhatAuthTokens.textPrimary,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                            )
                            Text("Store: ${authState.sellerStoreName.ifBlank { "-" }}", color = NotWhatAuthTokens.textMuted)
                            Text("Category: ${authState.sellerStoreCategory.ifBlank { "-" }}", color = NotWhatAuthTokens.textMuted)
                            Text("Seller: ${authState.sellerName.ifBlank { "-" }}", color = NotWhatAuthTokens.textMuted)
                            Text("Email: ${authState.sellerEmail.ifBlank { "-" }}", color = NotWhatAuthTokens.textMuted)
                            Text(
                                "Location: ${listOf(
                                    authState.sellerCity,
                                    authState.sellerState,
                                ).filter { it.isNotBlank() }.joinToString(", ")}",
                                color = NotWhatAuthTokens.textMuted,
                            )
                        }
                    }
                    Button(
                        onClick = { scope.launch { authState.submitSellerSignup() } },
                        enabled = authState.canSubmitSellerSignup,
                        modifier = Modifier.fillMaxWidth().height(54.dp),
                        shape = RoundedCornerShape(28.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = NotWhatAuthTokens.accent),
                    ) {
                        Text(if (authState.isLoading) "Creating account..." else "Create Seller Account")
                    }
                }
            }

            localStepError?.let { Text(it, color = Color(0xFFB42318), style = MaterialTheme.typography.bodySmall) }

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                if (sellerStep != SellerOnboardingStep.StoreInfo) {
                    Button(
                        onClick = {
                            localStepError = null
                            sellerStep =
                                when (sellerStep) {
                                    SellerOnboardingStep.Business -> SellerOnboardingStep.StoreInfo
                                    SellerOnboardingStep.Verify -> SellerOnboardingStep.Business
                                    else -> SellerOnboardingStep.StoreInfo
                                }
                        },
                        modifier = Modifier.weight(1f).height(52.dp),
                        shape = RoundedCornerShape(24.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = NotWhatColors.surfaceContainerHigh),
                    ) { Text("Back", color = NotWhatAuthTokens.textPrimary) }
                }
                if (sellerStep != SellerOnboardingStep.Verify) {
                    Button(
                        onClick = {
                            localStepError = null
                            when (sellerStep) {
                                SellerOnboardingStep.StoreInfo -> {
                                    if (canProceedStoreInfo()) {
                                        sellerStep = SellerOnboardingStep.Business
                                    } else {
                                        localStepError = "Complete store info before continuing."
                                    }
                                }

                                SellerOnboardingStep.Business -> {
                                    if (canProceedBusiness()) {
                                        sellerStep = SellerOnboardingStep.Verify
                                    } else {
                                        localStepError =
                                            "Complete business details before continuing. Password must be at least 8 characters with uppercase, a number, and a special character."
                                    }
                                }

                                else -> {
                                    Unit
                                }
                            }
                        },
                        modifier = Modifier.weight(1f).height(52.dp),
                        shape = RoundedCornerShape(24.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = NotWhatAuthTokens.accent),
                    ) { Text("Continue") }
                }
            }

            if (PlatformSocialAuthBridge.supportsGoogle || PlatformSocialAuthBridge.supportsApple) {
                HorizontalDivider(color = NotWhatAuthTokens.border)
                Text(
                    "OR CONTINUE WITH",
                    modifier = Modifier.align(Alignment.CenterHorizontally),
                    color = NotWhatAuthTokens.textFaint,
                    style = MaterialTheme.typography.labelSmall,
                )
                SocialButtons(authState, scope, signUpContext = true)
            }

            Surface(shape = RoundedCornerShape(16.dp), color = NotWhatColors.surfaceContainer, modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(
                        modifier = Modifier.size(34.dp).clip(RoundedCornerShape(17.dp)).background(NotWhatColors.primaryContainer),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text("!", color = NotWhatColors.onPrimaryContainer, fontWeight = FontWeight.Black)
                    }
                    Column {
                        Text("Quick Start Tip", color = NotWhatAuthTokens.accent, style = MaterialTheme.typography.labelMedium)
                        Text(
                            "Sellers with a clear bio get more bargain requests in week one.",
                            color = NotWhatAuthTokens.textMuted,
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                }
            }
            TextButton(onClick = authState::backToLogin, modifier = Modifier.align(Alignment.CenterHorizontally)) {
                Text("Back to login", color = NotWhatAuthTokens.textMuted)
            }
        }
    }
}

@Composable
private fun SocialButtons(
    authState: AuthState,
    scope: kotlinx.coroutines.CoroutineScope,
    signUpContext: Boolean,
) {
    val showGoogle = PlatformSocialAuthBridge.supportsGoogle
    val showApple = PlatformSocialAuthBridge.supportsApple
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (showGoogle && showApple) Arrangement.spacedBy(10.dp) else Arrangement.Center,
    ) {
        if (showGoogle) {
            Button(
                onClick = { scope.launch { authState.signInWithGoogle() } },
                modifier = (if (showApple) Modifier.weight(1f) else Modifier.widthIn(min = 160.dp)).height(52.dp),
                enabled = !authState.isLoading,
                shape = RoundedCornerShape(24.dp),
                colors =
                    ButtonDefaults.buttonColors(
                        containerColor = NotWhatColors.surfaceContainerHigh,
                        disabledContainerColor = NotWhatColors.surfaceContainerHigh.copy(alpha = 0.6f),
                    ),
            ) { Text(if (signUpContext) "Sign up with Google" else "Google", color = NotWhatAuthTokens.textPrimary) }
        }
        if (showApple) {
            Button(
                onClick = { scope.launch { authState.signInWithApple() } },
                modifier = (if (showGoogle) Modifier.weight(1f) else Modifier.widthIn(min = 160.dp)).height(52.dp),
                enabled = !authState.isLoading,
                shape = RoundedCornerShape(24.dp),
                colors =
                    ButtonDefaults.buttonColors(
                        containerColor = NotWhatColors.surfaceContainerHigh,
                        disabledContainerColor = NotWhatColors.surfaceContainerHigh.copy(alpha = 0.6f),
                    ),
            ) { Text("Apple", color = NotWhatAuthTokens.textPrimary) }
        }
    }
}

@Composable
private fun SignupVerificationCard(authState: AuthState) {
    val scope = rememberCoroutineScope()
    val pending = authState.pendingVerification
    var secondsLeft by remember(pending?.email) { mutableStateOf(59) }

    LaunchedEffect(secondsLeft, pending?.email) {
        if (secondsLeft > 0) {
            delay(1000)
            secondsLeft -= 1
        }
    }

    ElevatedCard(colors = CardDefaults.elevatedCardColors(containerColor = NotWhatAuthTokens.card)) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(
                modifier = Modifier.size(76.dp).clip(RoundedCornerShape(38.dp)).background(NotWhatAuthTokens.accent),
                contentAlignment = Alignment.Center,
            ) {
                Text("@", color = NotWhatColors.onPrimary, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black)
            }
            Text(
                "Verify Your Email",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = NotWhatAuthTokens.textPrimary,
            )
            Text("We sent a code to ${pending?.email.orEmpty()}", color = NotWhatAuthTokens.textMuted)
            OtpCodeRow(code = authState.verificationCode, onCodeChange = { authState.verificationCode = it })
            Text("Didn't receive the code?", color = NotWhatAuthTokens.textFaint)
            TextButton(onClick = {
                scope.launch { authState.resendSignupCode() }
                secondsLeft = 59
            }, enabled = secondsLeft == 0) {
                val timer = "00:${secondsLeft.toString().padStart(2, '0')}"
                Text(if (secondsLeft == 0) "Resend Code" else "Resend Code ($timer)", color = NotWhatAuthTokens.accent)
            }
            Button(
                onClick = {
                    scope.launch {
                        authState.verifySignup()
                    }
                },
                enabled = authState.canVerifySignup,
                modifier =
                    Modifier.fillMaxWidth().height(
                        54.dp,
                    ),
                shape = RoundedCornerShape(28.dp),
                colors = ButtonDefaults.buttonColors(containerColor = NotWhatAuthTokens.accent),
            ) {
                Text(if (authState.isLoading) "Verifying..." else "Verify and continue")
            }
            TextButton(onClick = authState::editSignupEmail) { Text("Edit details", color = NotWhatAuthTokens.accent) }
        }
    }
}

@Composable
private fun ForgotPasswordCard(authState: AuthState) {
    val scope = rememberCoroutineScope()
    ElevatedCard(colors = CardDefaults.elevatedCardColors(containerColor = NotWhatColors.surface)) {
        Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Forgot password?", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text("Enter your account email and we will send a 6-digit reset code.", color = NotWhatColors.onSurfaceVariant)
            AuthTextField("Email", authState.forgotEmail, { authState.forgotEmail = it }, false)
            Button(
                onClick = { scope.launch { authState.sendResetCode() } },
                enabled = authState.canSendResetCode,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(if (authState.isLoading) "Sending..." else "Send OTP")
            }
            TextButton(onClick = authState::backToLogin, modifier = Modifier.align(Alignment.End)) { Text("Back to login") }
        }
    }
}

@Composable
private fun ResetPasswordCard(authState: AuthState) {
    val scope = rememberCoroutineScope()
    ElevatedCard(colors = CardDefaults.elevatedCardColors(containerColor = NotWhatColors.surface)) {
        Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Reset password", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text("Use the OTP from your email and choose a new password.", color = NotWhatColors.onSurfaceVariant)
            AuthTextField("OTP", authState.resetOtp, { authState.resetOtp = it }, false)
            AuthTextField("New password", authState.resetNewPassword, { authState.resetNewPassword = it }, true)
            AuthTextField("Confirm password", authState.resetConfirmPassword, { authState.resetConfirmPassword = it }, true)
            Button(
                onClick = { scope.launch { authState.resetPassword() } },
                enabled = authState.canResetPassword,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(if (authState.isLoading) "Resetting..." else "Reset password")
            }
            TextButton(onClick = authState::backToLogin, modifier = Modifier.align(Alignment.End)) { Text("Back to login") }
        }
    }
}

// ── Progress header widgets ───────────────────────────────────────────────────

@Composable
private fun SignupProgressHeader() {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        SignupStep("1", "Account", active = true)
        SignupStep("2", "Personal", active = false)
        SignupStep("3", "Verify", active = false)
    }
}

@Composable
private fun SignupStep(
    index: String,
    label: String,
    active: Boolean,
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            modifier =
                Modifier
                    .size(
                        28.dp,
                    ).clip(RoundedCornerShape(14.dp))
                    .background(if (active) NotWhatAuthTokens.accent else NotWhatColors.surfaceContainerHigh),
            contentAlignment = Alignment.Center,
        ) {
            Text(index, color = if (active) NotWhatColors.onPrimary else NotWhatAuthTokens.textMuted, fontWeight = FontWeight.Bold)
        }
        Text(
            label,
            color = if (active) NotWhatAuthTokens.textPrimary else NotWhatAuthTokens.textFaint,
            style = MaterialTheme.typography.labelSmall,
        )
    }
}

@Composable
private fun SellerSetupProgressHeader(step: SellerOnboardingStep) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        SellerSetupStep("Store Info", active = step == SellerOnboardingStep.StoreInfo)
        SellerSetupStep("Business", active = step == SellerOnboardingStep.Business)
        SellerSetupStep("Verify", active = step == SellerOnboardingStep.Verify)
    }
}

@Composable
private fun SellerSetupStep(
    label: String,
    active: Boolean,
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            modifier =
                Modifier
                    .size(
                        if (active) 14.dp else 10.dp,
                    ).clip(RoundedCornerShape(7.dp))
                    .background(if (active) NotWhatAuthTokens.accent else NotWhatColors.outline.copy(alpha = 0.55f)),
        )
        Text(
            label,
            color = if (active) NotWhatAuthTokens.textPrimary else NotWhatAuthTokens.textFaint,
            style = MaterialTheme.typography.labelSmall,
        )
    }
}

private enum class SellerOnboardingStep { StoreInfo, Business, Verify }

@Composable
private fun StoreLogoPlaceholder(
    logoUri: String?,
    onPickLogo: () -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text("Store Logo", color = NotWhatAuthTokens.textMuted, style = MaterialTheme.typography.labelMedium)
        Box(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .height(
                        96.dp,
                    ).clip(
                        RoundedCornerShape(18.dp),
                    ).background(
                        NotWhatColors.surfaceContainer,
                    ).border(1.dp, NotWhatAuthTokens.border, RoundedCornerShape(18.dp))
                    .clickable(onClick = onPickLogo),
            contentAlignment = Alignment.Center,
        ) {
            if (logoUri != null) {
                DemoImage(
                    url = logoUri,
                    contentDescription = "Store logo",
                    modifier = Modifier.fillMaxSize(),
                    shape = RoundedCornerShape(18.dp),
                )
            } else {
                Text("Tap to upload logo", color = NotWhatAuthTokens.textFaint)
            }
        }
    }
}

@Composable
private fun OtpCodeRow(
    code: String,
    onCodeChange: (String) -> Unit,
) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
        val padded = code.take(6).padEnd(6, ' ')
        repeat(6) { index ->
            OutlinedTextField(
                value = if (padded[index] == ' ') "" else padded[index].toString(),
                onValueChange = { input ->
                    val c = input.lastOrNull()?.takeIf { it.isDigit() }
                    val chars = padded.toCharArray()
                    chars[index] = c ?: ' '
                    onCodeChange(chars.concatToString().trimEnd())
                },
                modifier = Modifier.weight(1f),
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                shape = RoundedCornerShape(12.dp),
                colors =
                    OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = NotWhatAuthTokens.accent,
                        unfocusedBorderColor = NotWhatAuthTokens.border,
                        focusedContainerColor = NotWhatAuthTokens.field,
                        unfocusedContainerColor = NotWhatAuthTokens.field,
                        focusedTextColor = NotWhatAuthTokens.textPrimary,
                        unfocusedTextColor = NotWhatAuthTokens.textPrimary,
                    ),
            )
        }
    }
}

// ── Shared field widget (internal — also used in SellerProfileSetupRequired) ──

@Composable
internal fun AuthTextField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    isPassword: Boolean,
    singleLine: Boolean = true,
    placeholder: String = "",
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = Modifier.fillMaxWidth(),
        label = { Text(label) },
        placeholder = { if (placeholder.isNotEmpty()) Text(placeholder) },
        singleLine = singleLine,
        visualTransformation = if (isPassword) PasswordVisualTransformation() else VisualTransformation.None,
        shape = RoundedCornerShape(16.dp),
        colors =
            OutlinedTextFieldDefaults.colors(
                focusedBorderColor = NotWhatAuthTokens.accent,
                focusedLabelColor = NotWhatAuthTokens.accent,
                unfocusedBorderColor = NotWhatAuthTokens.border,
                unfocusedLabelColor = NotWhatAuthTokens.textMuted,
                focusedContainerColor = NotWhatAuthTokens.field,
                unfocusedContainerColor = NotWhatAuthTokens.field,
                focusedTextColor = NotWhatAuthTokens.textPrimary,
                unfocusedTextColor = NotWhatAuthTokens.textPrimary,
                focusedPlaceholderColor = NotWhatAuthTokens.textFaint,
                unfocusedPlaceholderColor = NotWhatAuthTokens.textFaint,
            ),
    )
}

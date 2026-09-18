package com.notwhat.shared.ui

import androidx.compose.ui.window.ComposeUIViewController
import com.notwhat.shared.session.UserRole

fun MainViewController(appRole: String? = null) = ComposeUIViewController {
    initCoilForIos()
    NotWhatApp(forcedRole = appRoleFromString(appRole))
}

fun appRoleFromString(value: String?): UserRole? = when (value?.trim()?.lowercase()) {
    "buyer" -> UserRole.Buyer
    "seller" -> UserRole.Seller
    "admin" -> UserRole.Admin
    else -> null
}

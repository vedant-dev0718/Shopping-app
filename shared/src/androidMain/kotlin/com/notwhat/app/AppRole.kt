package com.notwhat.app

import com.notwhat.shared.session.UserRole

internal fun appRoleFromBuildConfig(value: String): UserRole? {
    return when (value.trim().lowercase()) {
        "buyer" -> UserRole.Buyer
        "seller" -> UserRole.Seller
        "admin" -> UserRole.Admin
        else -> null
    }
}

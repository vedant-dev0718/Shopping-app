package com.notwhat.shared.address

import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonNames

@OptIn(ExperimentalSerializationApi::class)
@Serializable
data class AddressDto(
    @JsonNames("id", "_id") val id: String = "",
    val fullName: String = "",
    val phone: String = "",
    val addressLine1: String = "",
    val addressLine2: String? = null,
    val landmark: String? = null,
    val city: String = "",
    val state: String = "",
    val pincode: String = "",
    val country: String = "India",
    val isDefault: Boolean = false,
    val isVerified: Boolean = false,
    val type: String = "delivery",   // "delivery" | "pickup"
)

@Serializable
data class AddressRequestDto(
    val fullName: String,
    val phone: String,
    val addressLine1: String,
    val addressLine2: String? = null,
    val landmark: String? = null,
    val city: String,
    val state: String,
    val pincode: String,
    val country: String = "India",
)

@Serializable
data class AddressValidateResponseDto(
    val valid: Boolean = false,
    val message: String? = null,
)

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

fun seedDeliveryAddresses(): List<AddressDto> = listOf(
    AddressDto(
        id = "seed-address-1",
        fullName = "Aryan Sharma",
        phone = "9999999999",
        addressLine1 = "12 MG Road",
        city = "Jaipur",
        state = "Rajasthan",
        pincode = "302001",
        isDefault = true,
        isVerified = true,
    ),
)

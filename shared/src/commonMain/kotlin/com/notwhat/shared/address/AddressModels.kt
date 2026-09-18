package com.notwhat.shared.address

import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonNames

@OptIn(ExperimentalSerializationApi::class)
@Serializable
data class AddressDto(
    @JsonNames("id", "_id") val id: String = "",
    @JsonNames("fullName", "contactName", "name") val fullName: String = "",
    @JsonNames("phone", "contactPhone") val phone: String = "",
    val addressLine1: String = "",
    val addressLine2: String? = null,
    val landmark: String? = null,
    val city: String = "",
    val state: String = "",
    @JsonNames("pincode", "postalCode") val pincode: String = "",
    val country: String = "India",
    val isDefault: Boolean = false,
    val isVerified: Boolean = false,
    @JsonNames("type", "addressType") val type: String = "home",
)

@Serializable
data class AddressRequestDto(
    @SerialName("contactName") val fullName: String,
    @SerialName("contactPhone") val phone: String,
    val addressLine1: String,
    val addressLine2: String? = null,
    val landmark: String? = null,
    val city: String,
    val state: String,
    @SerialName("postalCode") val pincode: String,
    val country: String = "India",
    @SerialName("addressType") val type: String = "home",
)

@Serializable
data class AddressValidateResponseDto(
    val valid: Boolean = false,
    val message: String? = null,
)

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

fun seedDeliveryAddresses(): List<AddressDto> =
    listOf(
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

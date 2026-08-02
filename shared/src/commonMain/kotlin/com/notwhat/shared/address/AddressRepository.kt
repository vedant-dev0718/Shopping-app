package com.notwhat.shared.address

import com.notwhat.shared.catalog.DeleteResponseDto
import com.notwhat.shared.core.NetworkResult
import com.notwhat.shared.core.runCatchingNetwork
import com.notwhat.shared.network.ApiClient

/** Live-only repository for buyer delivery addresses and seller pickup addresses. */
class AddressRepository(private val client: ApiClient) {

    // Buyer delivery addresses
    suspend fun listDeliveryAddresses(bearerToken: String): NetworkResult<List<AddressDto>> =
        runCatchingNetwork { client.get("addresses/delivery", bearerToken = bearerToken) }

    suspend fun getDeliveryAddress(id: String, bearerToken: String): NetworkResult<AddressDto> =
        runCatchingNetwork { client.get("addresses/delivery/$id", bearerToken = bearerToken) }

    suspend fun createDeliveryAddress(request: AddressRequestDto, bearerToken: String): NetworkResult<AddressDto> =
        runCatchingNetwork { client.post("addresses/delivery", request, bearerToken) }

    suspend fun updateDeliveryAddress(id: String, request: AddressRequestDto, bearerToken: String): NetworkResult<AddressDto> =
        runCatchingNetwork { client.patch("addresses/delivery/$id", request, bearerToken) }

    suspend fun deleteDeliveryAddress(id: String, bearerToken: String): NetworkResult<DeleteResponseDto> =
        runCatchingNetwork { client.delete("addresses/delivery/$id", bearerToken) }

    suspend fun setDefaultDeliveryAddress(id: String, bearerToken: String): NetworkResult<AddressDto> =
        runCatchingNetwork { client.patch("addresses/delivery/$id/default", emptyMap<String, String>(), bearerToken) }

    suspend fun validateDeliveryAddress(request: AddressRequestDto, bearerToken: String): NetworkResult<AddressValidateResponseDto> =
        runCatchingNetwork { client.post("addresses/delivery/validate", request, bearerToken) }

    // Seller pickup addresses
    suspend fun listPickupAddresses(bearerToken: String): NetworkResult<List<AddressDto>> =
        runCatchingNetwork { client.get("seller/pickup-addresses", bearerToken = bearerToken) }

    suspend fun createPickupAddress(request: AddressRequestDto, bearerToken: String): NetworkResult<AddressDto> =
        runCatchingNetwork { client.post("seller/pickup-addresses", request, bearerToken) }

    suspend fun updatePickupAddress(id: String, request: AddressRequestDto, bearerToken: String): NetworkResult<AddressDto> =
        runCatchingNetwork { client.patch("seller/pickup-addresses/$id", request, bearerToken) }

    suspend fun deletePickupAddress(id: String, bearerToken: String): NetworkResult<DeleteResponseDto> =
        runCatchingNetwork { client.delete("seller/pickup-addresses/$id", bearerToken) }

    suspend fun setDefaultPickupAddress(id: String, bearerToken: String): NetworkResult<AddressDto> =
        runCatchingNetwork { client.patch("seller/pickup-addresses/$id/default", emptyMap<String, String>(), bearerToken) }
}

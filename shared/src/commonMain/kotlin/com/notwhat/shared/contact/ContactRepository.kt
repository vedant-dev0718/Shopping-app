package com.notwhat.shared.contact

import com.notwhat.shared.core.NetworkResult
import com.notwhat.shared.core.runCatchingNetwork
import com.notwhat.shared.network.ApiClient

/** Contact support — POST /contact/support (optionally authenticated). */
class ContactRepository(
    private val client: ApiClient,
) {
    suspend fun submitSupportRequest(
        request: SupportRequestDto,
        bearerToken: String? = null,
    ): NetworkResult<SupportResponseDto> = runCatchingNetwork { client.post("contact/support", request, bearerToken ?: "") }
}

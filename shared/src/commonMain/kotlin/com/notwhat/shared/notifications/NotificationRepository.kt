package com.notwhat.shared.notifications

import com.notwhat.shared.core.NetworkResult
import com.notwhat.shared.core.runCatchingNetwork
import com.notwhat.shared.network.ApiClient
import io.ktor.http.encodeURLQueryComponent

/** Live-only repository for registering/removing push notification device tokens. */
class NotificationRepository(private val client: ApiClient) {

    suspend fun registerDeviceToken(request: DeviceTokenRequestDto, bearerToken: String): NetworkResult<DeviceTokenResponseDto> =
        runCatchingNetwork { client.post("notifications/device-token", request, bearerToken) }

    suspend fun removeDeviceToken(fcmToken: String, bearerToken: String): NetworkResult<DeviceTokenRemovedResponseDto> =
        runCatchingNetwork {
            client.delete("notifications/device-token?fcmToken=${fcmToken.encodeURLQueryComponent()}", bearerToken)
        }
}

package com.notwhat.shared.notifications

import com.notwhat.shared.auth.SharedAuthPersistence
import com.notwhat.shared.di.ServiceLocator
import com.notwhat.shared.order.OrderDto
import com.notwhat.shared.session.UserRole

/**
 * Entry point native background schedulers (iOS BGTaskScheduler, Android WorkManager) call while
 * the app is backgrounded. Fetches the signed-in user's orders and fires local notifications for
 * anything that changed since the last check — the same diff `OrderStatusNotifier` runs in-app.
 */
object BackgroundOrderSync {

    suspend fun checkForUpdates() {
        val session = SharedAuthPersistence().loadSession() ?: return
        val token = session.authToken ?: return
        val serviceLocator = ServiceLocator()

        val current: List<OrderDto> = when (session.role) {
            UserRole.Seller -> serviceLocator.sellerUseCase.listOrders(token)
            else -> serviceLocator.orderUseCase.listOrders(token)
        }.getOrNull() ?: return

        val previous = OrderSnapshotStore.load()
        OrderStatusNotifier.notifyChanges(previous, current, session.role)
        OrderSnapshotStore.save(current.associate { it.id to it.status })
    }
}

package com.notwhat.shared.notifications

import com.notwhat.shared.order.OrderDto
import com.notwhat.shared.session.UserRole

/**
 * Fires local notifications by diffing an order list against its previous snapshot.
 * Stand-in for backend push until Firebase credentials are configured: every buyer/seller
 * screen refresh (polling) surfaces the same title/subtitle a server push would have sent.
 */
object OrderStatusNotifier {

    fun notifyChanges(previous: List<OrderDto>, current: List<OrderDto>, role: UserRole) {
        if (previous.isEmpty()) return // first load after login; nothing "changed" yet
        notifyChanges(previous.associate { it.id to it.status }, current, role)
    }

    /** Overload for callers (e.g. background sync) that only persisted a lightweight id-to-status snapshot. */
    fun notifyChanges(previousStatusById: Map<String, String>, current: List<OrderDto>, role: UserRole) {
        if (previousStatusById.isEmpty()) return // first load after login; nothing "changed" yet

        current.forEach { order ->
            val previousStatus = previousStatusById[order.id]

            if (previousStatus == null) {
                if (role == UserRole.Seller) {
                    LocalNotificationBridge.show(
                        title = "New order received",
                        subtitle = "Order #${order.orderNumber ?: order.id} needs your attention",
                        data = mapOf("orderId" to order.id),
                    )
                }
            } else if (previousStatus != order.status) {
                val (title, subtitle) = describeStatusChange(role, order) ?: return@forEach
                LocalNotificationBridge.show(title, subtitle, mapOf("orderId" to order.id))
            }
        }
    }

    private fun describeStatusChange(role: UserRole, order: OrderDto): Pair<String, String>? {
        val label = order.orderNumber ?: order.id

        return if (role == UserRole.Seller) {
            when (order.status) {
                "return_requested" -> "Return requested" to "Buyer requested a return for order #$label"
                "cancelled", "cancelled_unavailable" -> "Order cancelled" to "Order #$label was cancelled"
                else -> null
            }
        } else {
            when (order.status) {
                "processing", "confirmed" -> "Order accepted" to "The seller accepted order #$label"
                "shipped" -> "Order shipped" to "Order #$label is on its way"
                "delivered" -> "Order delivered" to "Order #$label has been delivered"
                "cancelled", "cancelled_unavailable" -> "Order cancelled" to "Order #$label has been cancelled"
                "return_approved" -> "Return approved" to "Your return for order #$label was approved"
                "return_rejected" -> "Return rejected" to "Your return for order #$label was rejected"
                else -> null
            }
        }
    }
}

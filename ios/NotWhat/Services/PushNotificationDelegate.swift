import UIKit
import UserNotifications
import BackgroundTasks

#if canImport(SharedKit)
import SharedKit
#endif
#if canImport(FirebaseCore)
import FirebaseCore
#endif
#if canImport(FirebaseMessaging)
import FirebaseMessaging
#endif

private let orderRefreshTaskIdentifier = "com.notwhat.app.orderRefresh"
private let orderProcessingTaskIdentifier = "com.notwhat.app.orderProcessing"
private let orderRefreshMinimumInterval: TimeInterval = 15 * 60

/// Registers for remote notifications and forwards the resulting push token into the
/// shared Kotlin layer (`IosPushTokenBridgeRegistry`), which `NotWhatAppState` reads once
/// a buyer/seller session is active.
///
/// Requires two manual, one-time Xcode steps that can't be done via file edits:
/// 1. Add the "Firebase iOS SDK" Swift package (product: FirebaseMessaging) via
///    Xcode -> target -> Package Dependencies, so APNs tokens can be exchanged for FCM tokens.
/// 2. Enable the "Push Notifications" capability for this target (Signing & Capabilities),
///    which also requires push enabled on the App ID in the Apple Developer portal.
final class PushNotificationDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        #if canImport(FirebaseCore)
        if FirebaseApp.app() == nil {
            FirebaseApp.configure()
        }
        #endif
        #if canImport(FirebaseMessaging)
        Messaging.messaging().delegate = self
        #endif

        UNUserNotificationCenter.current().delegate = self

        BGTaskScheduler.shared.register(forTaskWithIdentifier: orderRefreshTaskIdentifier, using: nil) { task in
            // swiftlint:disable:next force_cast
            self.handleOrderRefresh(task: task as! BGAppRefreshTask)
        }
        BGTaskScheduler.shared.register(forTaskWithIdentifier: orderProcessingTaskIdentifier, using: nil) { task in
            // swiftlint:disable:next force_cast
            self.handleOrderRefresh(task: task as! BGProcessingTask)
        }
        scheduleOrderRefresh()
        logBackgroundRefreshStatusIfRestricted()

        // Request permission, then register for APNs only once the user grants it.
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            guard granted else {
                if let error {
                    print("[push] Notification permission not granted: \(error.localizedDescription)")
                }
                return
            }
            DispatchQueue.main.async {
                application.registerForRemoteNotifications()
            }
        }

        return true
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        scheduleOrderRefresh()
    }

    private func scheduleOrderRefresh() {
        let refreshRequest = BGAppRefreshTaskRequest(identifier: orderRefreshTaskIdentifier)
        refreshRequest.earliestBeginDate = Date(timeIntervalSinceNow: orderRefreshMinimumInterval)
        try? BGTaskScheduler.shared.submit(refreshRequest)

        // A processing task gives the system a second, independent chance to run us
        // (e.g. while charging/on Wi-Fi), on top of the opportunistic app-refresh task.
        let processingRequest = BGProcessingTaskRequest(identifier: orderProcessingTaskIdentifier)
        processingRequest.earliestBeginDate = Date(timeIntervalSinceNow: orderRefreshMinimumInterval)
        processingRequest.requiresNetworkConnectivity = true
        try? BGTaskScheduler.shared.submit(processingRequest)
    }

    /// Background tasks never fire at all if the user (or Low Power Mode) turned this off in Settings.
    private func logBackgroundRefreshStatusIfRestricted() {
        if UIApplication.shared.backgroundRefreshStatus != .available {
            print("[push] Background App Refresh is off — enable it in Settings > General > Background App Refresh for background notifications to work.")
        }
    }

    private func handleOrderRefresh(task: BGTask) {
        scheduleOrderRefresh() // keep the chain going regardless of this run's outcome

        task.expirationHandler = {
            task.setTaskCompleted(success: false)
        }

        #if canImport(SharedKit)
        BackgroundOrderSync.shared.checkForUpdates { error in
            task.setTaskCompleted(success: error == nil)
        }
        #else
        task.setTaskCompleted(success: true)
        #endif
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        #if canImport(FirebaseMessaging)
        Messaging.messaging().apnsToken = deviceToken
        #else
        let hexToken = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        setSharedPushToken(hexToken)
        #endif
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("[push] APNs registration failed: \(error.localizedDescription)")
    }

    /// Notification arrives while the app is in the foreground; still surface the banner.
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound, .badge])
    }

    /// Notification tapped from background/killed or foreground; builds a route from the
    /// backend's data payload (`orderId` / `productId`) since APNs has no native "route" field.
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo

        if let orderId = userInfo["orderId"] as? String {
            setPendingDeepLinkRoute("order/\(orderId)")
        } else if let productId = userInfo["productId"] as? String {
            setPendingDeepLinkRoute("product/\(productId)")
        }

        completionHandler()
    }

    private func setSharedPushToken(_ token: String?) {
        #if canImport(SharedKit)
        IosPushTokenBridgeRegistry.shared.setToken(value: token)
        #endif
    }

    private func setPendingDeepLinkRoute(_ route: String) {
        #if canImport(SharedKit)
        IosPendingDeepLinkRegistry.shared.setRoute(value: route)
        #endif
    }
}

#if canImport(FirebaseMessaging)
extension PushNotificationDelegate: MessagingDelegate {
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        setSharedPushToken(fcmToken)
    }
}
#endif

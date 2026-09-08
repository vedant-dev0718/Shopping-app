import SwiftUI

@main
struct NotWhatApp: App {
    @UIApplicationDelegateAdaptor(PushNotificationDelegate.self) private var pushDelegate

    var body: some Scene {
        WindowGroup {
            SharedRootHostView()
        }
    }
}

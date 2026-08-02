import Foundation
import GoogleSignIn
import UIKit

enum GoogleSignInError: LocalizedError {
    case missingClientID
    case missingPresentingViewController
    case missingIDToken
    case cancelled

    var errorDescription: String? {
        switch self {
        case .missingClientID:
            return "Google Sign-In is not configured yet."
        case .missingPresentingViewController:
            return "Google Sign-In could not open. Please try again."
        case .missingIDToken:
            return "We could not verify your Google account. Please try again."
        case .cancelled:
            return "Google sign-in was cancelled."
        }
    }
}

@MainActor
final class GoogleSignInManager {
    static let shared = GoogleSignInManager()

    private init() {}

    func signIn() async throws -> String {
        let configuration = try makeConfiguration()
        GIDSignIn.sharedInstance.configuration = configuration

        guard let presentingViewController = Self.presentingViewController() else {
            throw GoogleSignInError.missingPresentingViewController
        }

        do {
            let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: presentingViewController)

            guard let idToken = result.user.idToken?.tokenString, !idToken.isEmpty else {
                throw GoogleSignInError.missingIDToken
            }

            return idToken
        } catch {
            let nsError = error as NSError
            if nsError.domain == kGIDSignInErrorDomain && nsError.code == GIDSignInError.Code.canceled.rawValue {
                throw GoogleSignInError.cancelled
            }

            throw error
        }
    }

    func handleOpenURL(_ url: URL) -> Bool {
        GIDSignIn.sharedInstance.handle(url)
    }

    private func makeConfiguration() throws -> GIDConfiguration {
        guard let clientID = googlePlistValue("CLIENT_ID") ?? Bundle.main.object(forInfoDictionaryKey: "GIDClientID") as? String,
              !clientID.isEmpty else {
            throw GoogleSignInError.missingClientID
        }

        let serverClientID = googlePlistValue("SERVER_CLIENT_ID") ?? Bundle.main.object(forInfoDictionaryKey: "GIDServerClientID") as? String
        return GIDConfiguration(clientID: clientID, serverClientID: serverClientID)
    }

    private func googlePlistValue(_ key: String) -> String? {
        guard let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
              let plist = NSDictionary(contentsOfFile: path) as? [String: Any],
              let value = plist[key] as? String,
              !value.isEmpty else {
            return nil
        }

        return value
    }

    private static func presentingViewController() -> UIViewController? {
        let scene = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first { $0.activationState == .foregroundActive }

        let rootViewController = scene?.windows.first { $0.isKeyWindow }?.rootViewController
        return topViewController(from: rootViewController)
    }

    private static func topViewController(from rootViewController: UIViewController?) -> UIViewController? {
        if let navigationController = rootViewController as? UINavigationController {
            return topViewController(from: navigationController.visibleViewController)
        }

        if let tabBarController = rootViewController as? UITabBarController {
            return topViewController(from: tabBarController.selectedViewController)
        }

        if let presentedViewController = rootViewController?.presentedViewController {
            return topViewController(from: presentedViewController)
        }

        return rootViewController
    }
}

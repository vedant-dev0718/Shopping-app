import SwiftUI

#if canImport(SharedKit)
import AuthenticationServices
import GoogleSignIn
import SharedKit
#if canImport(PhotosUI)
import PhotosUI
import UniformTypeIdentifiers
#endif
#endif

struct SharedRootHostView: View {
    var body: some View {
        #if canImport(SharedKit)
        SharedRootControllerRepresentable()
            .ignoresSafeArea()
            .task {
                SharedSocialAuthInstaller.installIfNeeded()
            }
        #else
        VStack(spacing: 12) {
            Text("Shared host unavailable")
                .font(.title2.weight(.bold))

            Text("Build SharedKit and keep the framework search path pointed at the generated output before enabling the shared app flag.")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
        }
        .padding(24)
        #endif
    }
}

#if canImport(SharedKit)
private struct SharedRootControllerRepresentable: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> UIViewController {
        let raw = Bundle.main.infoDictionary?["APP_ROLE"] as? String
        let appRole = (raw?.isEmpty == false) ? raw : nil
        return MainViewControllerKt.MainViewController(appRole: appRole)
    }

    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {
    }
}

@MainActor
private enum SharedSocialAuthInstaller {
    private static var installed = false

    static func installIfNeeded() {
        guard !installed else { return }
        installed = true

        IosSocialAuthBridgeRegistry.shared.registerGoogleSignIn { completion in
            Task { @MainActor in
                do {
                    let idToken = try await GoogleSignInManager.shared.signIn()
                    _ = completion(SocialAuthPayload(idToken: idToken, fullName: nil), nil)
                } catch {
                    _ = completion(nil, error.localizedDescription)
                }
            }
        }

        IosSocialAuthBridgeRegistry.shared.registerAppleSignIn { completion in
            Task { @MainActor in
                do {
                    let result = try await AppleSignInCoordinator.shared.signIn()
                    _ = completion(SocialAuthPayload(idToken: result.identityToken, fullName: result.fullName), nil)
                } catch {
                    _ = completion(nil, error.localizedDescription)
                }
            }
        }
    }
}

private struct AppleSignInResult {
    let identityToken: String
    let fullName: String?
}

@MainActor
private final class AppleSignInCoordinator: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    static let shared = AppleSignInCoordinator()

    private var continuation: CheckedContinuation<AppleSignInResult, Error>?

    func signIn() async throws -> AppleSignInResult {
        try await withCheckedThrowingContinuation { continuation in
            self.continuation = continuation

            let request = ASAuthorizationAppleIDProvider().createRequest()
            request.requestedScopes = [.fullName, .email]

            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        }
    }

    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .first(where: \ .isKeyWindow) ?? ASPresentationAnchor()
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let tokenData = credential.identityToken,
              let identityToken = String(data: tokenData, encoding: .utf8),
              !identityToken.isEmpty else {
            continuation?.resume(throwing: NSError(domain: "SharedSocialAuth", code: 1, userInfo: [NSLocalizedDescriptionKey: "We could not verify your Apple account. Please try again."]))
            continuation = nil
            return
        }

        let fullName = credential.fullName.flatMap { components -> String? in
            let formatted = PersonNameComponentsFormatter().string(from: components).trimmingCharacters(in: .whitespaces)
            return formatted.isEmpty ? nil : formatted
        }

        continuation?.resume(returning: AppleSignInResult(identityToken: identityToken, fullName: fullName))
        continuation = nil
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        if let authorizationError = error as? ASAuthorizationError, authorizationError.code == .canceled {
            continuation?.resume(throwing: NSError(domain: "SharedSocialAuth", code: 2, userInfo: [NSLocalizedDescriptionKey: "Apple sign-in was cancelled."]))
        } else {
            continuation?.resume(throwing: error)
        }
        continuation = nil
    }
}

#endif

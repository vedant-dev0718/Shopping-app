import SwiftUI

#if canImport(SharedKit)
import AuthenticationServices
import GoogleSignIn
import SharedKit
#if canImport(Razorpay)
import Razorpay
#endif
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
                SharedMediaPickerInstaller.installIfNeeded()
                SharedPaymentInstaller.installIfNeeded()
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

@MainActor
private enum SharedMediaPickerInstaller {
    private static var installed = false

    static func installIfNeeded() {
        guard !installed else { return }
        installed = true

        let videoPicker = VideoPickerCoordinator()
        IosMediaPickerBridgeRegistry.shared.registerVideoPicker { callback in
            guard let root = UIApplication.shared.connectedScenes
                .compactMap({ $0 as? UIWindowScene })
                .flatMap(\.windows)
                .first(where: \.isKeyWindow)?
                .rootViewController else { callback(nil); return }
            videoPicker.pick(from: root.topmostPresented) { uri in callback(uri) }
        }

        let thumbPicker = ThumbnailPickerCoordinator()
        IosImagePickerBridgeRegistry.shared.registerImagePicker { callback in
            guard let root = UIApplication.shared.connectedScenes
                .compactMap({ $0 as? UIWindowScene })
                .flatMap(\.windows)
                .first(where: \.isKeyWindow)?
                .rootViewController else { callback(nil); return }
            thumbPicker.pick(from: root.topmostPresented) { uri in callback(uri) }
        }
        
        // Register multi-image picker
        IosImagePickerBridgeRegistry.shared.registerImagePickerMulti { callback in
            guard let root = UIApplication.shared.connectedScenes
                .compactMap({ $0 as? UIWindowScene })
                .flatMap(\.windows)
                .first(where: \.isKeyWindow)?
                .rootViewController else { callback([]); return }
            thumbPicker.pickMultiple(from: root.topmostPresented) { uris in callback(uris) }
        }
    }
}

@MainActor
private enum SharedPaymentInstaller {
    private static var installed = false

    static func installIfNeeded() {
        guard !installed else { return }
        installed = true

        PlatformPaymentBridge.shared.registerRazorpayCheckout { request, callback in
            #if canImport(Razorpay)
            guard let root = UIApplication.shared.connectedScenes
                .compactMap({ $0 as? UIWindowScene })
                .flatMap(\.windows)
                .first(where: \.isKeyWindow)?
                .rootViewController else {
                callback(nil, "Unable to open Razorpay checkout.")
                return
            }

            RazorpayCheckoutCoordinator.shared.open(
                keyId: request.keyId,
                orderId: request.orderId,
                amount: Int(request.amount),
                currency: request.currency,
                merchantName: request.merchantName,
                description: request.checkoutDescription,
                prefillEmail: request.prefillEmail,
                prefillPhone: request.prefillPhone,
                presentingController: root.topmostPresented,
                completion: callback
            )
            #else
            callback(nil, "Razorpay SDK is not linked in this iOS target.")
            #endif
        }
    }
}

#if canImport(Razorpay)
@MainActor
private final class RazorpayCheckoutCoordinator: NSObject, RazorpayPaymentCompletionProtocolWithData {
    static let shared = RazorpayCheckoutCoordinator()

    private var completion: ((RazorpayCheckoutCallbackPayload?, String?) -> Void)?
    private var expectedOrderId: String = ""

    func open(
        keyId: String,
        orderId: String,
        amount: Int,
        currency: String,
        merchantName: String,
        description: String,
        prefillEmail: String?,
        prefillPhone: String?,
        presentingController: UIViewController,
        completion: @escaping (RazorpayCheckoutCallbackPayload?, String?) -> Void
    ) {
        self.completion = completion
        self.expectedOrderId = orderId

        let checkout = RazorpayCheckout.initWithKey(keyId, andDelegateWithData: self)
        var options: [String: Any] = [
            "amount": amount,
            "currency": currency,
            "name": merchantName,
            "description": description,
            "order_id": orderId,
        ]

        var prefill: [String: String] = [:]
        if let email = prefillEmail, !email.isEmpty {
            prefill["email"] = email
        }
        if let phone = prefillPhone, !phone.isEmpty {
            prefill["contact"] = phone
        }
        if !prefill.isEmpty {
            options["prefill"] = prefill
        }

        checkout.open(options, displayController: presentingController)
    }

    func onPaymentSuccess(_ payment_id: String, andData response: [AnyHashable : Any]?) {
        let callbackOrderId = response?["razorpay_order_id"] as? String
        let callbackSignature = response?["razorpay_signature"] as? String

        let responsePayload = RazorpayCheckoutCallbackPayload(
            razorpayOrderId: callbackOrderId?.isEmpty == false ? callbackOrderId! : expectedOrderId,
            razorpayPaymentId: payment_id,
            razorpaySignature: callbackSignature ?? ""
        )

        completion?(responsePayload, nil)
        completion = nil
        expectedOrderId = ""
    }

    func onPaymentError(_ code: Int32, description str: String, andData response: [AnyHashable : Any]?) {
        let fallback = code == 2 ? "Payment cancelled by user." : "Razorpay payment failed."
        completion?(nil, str.isEmpty ? fallback : str)
        completion = nil
        expectedOrderId = ""
    }
}
#endif

#endif

// Walks the presentation chain to find the controller that can safely present a new sheet.
private extension UIViewController {
    var topmostPresented: UIViewController {
        var current = self
        while let next = current.presentedViewController, !next.isBeingDismissed {
            current = next
        }
        return current
    }
}

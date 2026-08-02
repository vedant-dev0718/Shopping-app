import UIKit
import PhotosUI
import UniformTypeIdentifiers

/// Presents a PHPickerViewController for video selection and returns a file:// URL
/// to a temp-directory copy of the chosen video.
@MainActor
final class VideoPickerCoordinator: NSObject, PHPickerViewControllerDelegate {

    private var completion: ((String?) -> Void)?

    // MARK: – Public

    func pick(from viewController: UIViewController, completion: @escaping (String?) -> Void) {
        self.completion = completion

        var config = PHPickerConfiguration()
        config.filter = .videos
        config.selectionLimit = 1
        config.preferredAssetRepresentationMode = .current

        let picker = PHPickerViewController(configuration: config)
        picker.delegate = self
        viewController.present(picker, animated: true)
    }

    // MARK: – PHPickerViewControllerDelegate

    nonisolated func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
        Task { @MainActor in picker.dismiss(animated: true) }

        guard let result = results.first else {
            Task { @MainActor [weak self] in self?.finish(nil) }
            return
        }

        let movieType = UTType.movie.identifier
        guard result.itemProvider.hasItemConformingToTypeIdentifier(movieType) else {
            Task { @MainActor [weak self] in self?.finish(nil) }
            return
        }

        result.itemProvider.loadFileRepresentation(forTypeIdentifier: movieType) { [weak self] url, error in
            guard let sourceURL = url, error == nil else {
                Task { @MainActor [weak self] in self?.finish(nil) }
                return
            }

            // Copy to a stable temp location before the sandbox clears the original
            let dest = FileManager.default.temporaryDirectory
                .appendingPathComponent("notwhat_reel_\(UUID().uuidString)")
                .appendingPathExtension(sourceURL.pathExtension)

            do {
                try FileManager.default.copyItem(at: sourceURL, to: dest)
                Task { @MainActor [weak self] in self?.finish(dest.absoluteString) }
            } catch {
                Task { @MainActor [weak self] in self?.finish(nil) }
            }
        }
    }

    // MARK: – Private

    private func finish(_ uri: String?) {
        completion?(uri)
        completion = nil
    }
}

import UIKit
import PhotosUI
import UniformTypeIdentifiers

/// Presents a PHPickerViewController for image selection and returns a file:// URL
/// to a temp-directory copy of the chosen image.
@MainActor
final class ThumbnailPickerCoordinator: NSObject, PHPickerViewControllerDelegate {

    private var completion: ((String?) -> Void)?
    private var multiCompletion: (([String]) -> Void)?

    // MARK: – Public

    func pick(from viewController: UIViewController, completion: @escaping (String?) -> Void) {
        self.completion = completion

        var config = PHPickerConfiguration()
        config.filter = .images
        config.selectionLimit = 0  // Allow multiple image selection
        config.preferredAssetRepresentationMode = .current

        let picker = PHPickerViewController(configuration: config)
        picker.delegate = self
        viewController.present(picker, animated: true)
    }

    // MARK: – PHPickerViewControllerDelegate

    nonisolated func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
        Task { @MainActor in picker.dismiss(animated: true) }

        // Handle multi-selection if callback is set
        if results.isEmpty {
            Task { @MainActor [weak self] in 
                self?.finishMulti([])
                self?.finish(nil)
            }
            return
        }

        let imageType = UTType.image.identifier
        var copiedURLs: [String] = []
        let group = DispatchGroup()
        
        for result in results {
            guard result.itemProvider.hasItemConformingToTypeIdentifier(imageType) else {
                continue
            }

            group.enter()
            result.itemProvider.loadFileRepresentation(forTypeIdentifier: imageType) { [weak self] url, error in
                defer { group.leave() }
                guard let sourceURL = url, error == nil else {
                    return
                }

                let dest = FileManager.default.temporaryDirectory
                    .appendingPathComponent("notwhat_thumb_\(UUID().uuidString)")
                    .appendingPathExtension(sourceURL.pathExtension)

                do {
                    try FileManager.default.copyItem(at: sourceURL, to: dest)
                    copiedURLs.append(dest.absoluteString)
                } catch {
                    // Skip this image on error
                }
            }
        }
        
        group.notify(queue: .main) { [weak self] in
            Task { @MainActor in
                if copiedURLs.isEmpty {
                    self?.finish(nil)
                    self?.finishMulti([])
                } else if let first = copiedURLs.first {
                    self?.finish(first)  // For backward compatibility, return first image to single callback
                    self?.finishMulti(copiedURLs)  // Also call multi callback if set
                }
            }
        }
    }

    // MARK: – Public (Multi-selection)
    
    func pickMultiple(from viewController: UIViewController, completion: @escaping ([String]) -> Void) {
        self.multiCompletion = completion
        
        var config = PHPickerConfiguration()
        config.filter = .images
        config.selectionLimit = 0  // Allow unlimited selection
        config.preferredAssetRepresentationMode = .current
        
        let picker = PHPickerViewController(configuration: config)
        picker.delegate = self
        viewController.present(picker, animated: true)
    }
    
    // MARK: – Private

    private func finish(_ uri: String?) {
        completion?(uri)
        completion = nil
    }
    
    private func finishMulti(_ uris: [String]) {
        multiCompletion?(uris)
        multiCompletion = nil
    }
}

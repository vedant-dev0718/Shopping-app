# Multi-Image Gallery Picker Implementation

## Overview
Enhanced the product image upload feature to support batch image selection from the device gallery. Users can now select multiple images at once instead of selecting them one-at-a-time.

## Changes Made

### 1. iOS (Swift) - `ThumbnailPickerCoordinator.swift`
- **Changed selection limit from 1 to unlimited** (`selectionLimit = 0`)
- **Added multi-image support**:
  - New `multiCompletion` callback for handling multiple images
  - New `pickMultiple()` public method
  - Enhanced `picker(_:didFinishPicking:)` to process all selected images in parallel using `DispatchGroup`
  - Maintains backward compatibility by calling both single and multi completions

### 2. Kotlin Bridge Registry - `IosImagePickerBridgeRegistry.kt`
- **Added multi-image handler infrastructure**:
  - `multiHandler` property to store the multi-image callback
  - `registerImagePickerMulti()` to register the Swift handler
  - `isMultiRegistered()` to check availability
  - `launchMulti()` to trigger the multi-image picker

### 3. Platform Abstraction Layer

**`PlatformImagePicker.ios.kt`**:
- Added `isMultiAvailable()` function
- Added `launchMulti()` function that delegates to the registry

**`PlatformImagePicker.android.kt`**:
- Added stubs for `isMultiAvailable()` and `launchMulti()` for API consistency

### 4. Swift Setup - `SharedRootHostView.swift`
- Registered the multi-image picker in `SharedMediaPickerInstaller`:
  ```swift
  IosImagePickerBridgeRegistry.shared.registerImagePickerMulti { callback in
      // Presents PHPickerViewController allowing unlimited image selection
      thumbPicker.pickMultiple(from: root.topmostPresented) { uris in callback(uris) }
  }
  ```

### 5. Kotlin UI Logic - `ProductOnboardingScreens.kt`
Enhanced the `onAddImage` callback to:
- **Check for multi-image picker availability** via `PlatformImagePicker.isMultiAvailable()`
- **If available**: Use `launchMulti()` to allow batch selection
  - Loads all selected images in parallel
  - Uploads each image and collects URLs
  - Continues processing if one image fails
  - Updates the UI with all successfully uploaded images
- **If unavailable**: Falls back to single-image picker for backward compatibility

## User Experience Flow

### Before (Single-at-a-time)
1. User taps "Add Image"
2. Gallery opens, selects 1 image
3. Image uploads and appears in list
4. Repeat steps 1-3 for each additional image

### After (Batch Selection)
1. User taps "Add Image"
2. Gallery opens, user selects multiple images (with checkmarks for multi-select)
3. All images upload in parallel
4. All successfully uploaded images appear in the list

## Technical Details

### Image Processing Pipeline
```
User Selection → Parallel Download from Gallery
                 ↓
           Batch Upload to Server
                 ↓
            Add URLs to Display
```

### Error Handling
- If one image fails to read, the process continues with others
- If one image fails to upload, error is shown but other images continue uploading
- User sees count of successfully uploaded images

### File Naming
- Temporary files: `notwhat_thumb_<UUID>.<ext>`
- Files are cleaned up from temp directory after upload

## API Contracts

### Swift Side
```swift
func pickMultiple(from: UIViewController, completion: @escaping ([String]) -> Void)
// Returns list of file:// URLs to temp-directory copies
```

### Kotlin Side
```kotlin
fun launchMulti(onResult: (List<String>) -> Unit)
// Calls with list of selected image URIs
```

## Backward Compatibility
- Existing code using single-image picker (`PlatformImagePicker.launch()`) continues to work
- Falls back gracefully on platforms without multi-picker support
- Android currently stubs out multi-picker (not implemented)

## Testing Checklist

- [ ] Xcode builds without errors/warnings
- [ ] PHPickerViewController shows checkmarks for multiple selection
- [ ] Can select 0, 1, 2+ images
- [ ] All selected images upload successfully
- [ ] Images appear in the product preview
- [ ] Can remove individual images with red X button
- [ ] Image count updates correctly ("Images: N selected")
- [ ] Error handling works if one image fails to upload
- [ ] Fallback to single picker works if multi not available
- [ ] Canceling picker doesn't crash or show errors

## Files Modified

1. `/ios/NotWhat/Services/ThumbnailPickerCoordinator.swift`
2. `/shared/src/iosMain/kotlin/in/notwhat/shared/ui/IosImagePickerBridgeRegistry.kt`
3. `/shared/src/iosMain/kotlin/in/notwhat/shared/ui/PlatformImagePicker.ios.kt`
4. `/shared/src/androidMain/kotlin/com/notwhat/shared/ui/PlatformImagePicker.android.kt`
5. `/ios/NotWhat/App/SharedRootHostView.swift`
6. `/shared/src/commonMain/kotlin/com/notwhat/shared/ui/feature/seller/ProductOnboardingScreens.kt`

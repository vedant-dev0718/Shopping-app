package com.notwhat.app

import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts.PickMultipleVisualMedia
import androidx.activity.result.contract.ActivityResultContracts.PickVisualMedia
import androidx.activity.result.contract.ActivityResultContracts.RequestPermission
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetCredentialResponse
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException
import com.google.firebase.FirebaseApp
import com.google.firebase.messaging.FirebaseMessaging
import com.notwhat.shared.auth.AndroidAppContextHolder
import com.notwhat.shared.auth.AndroidSocialAuthBridgeRegistry
import com.notwhat.shared.auth.SharedAuthException
import com.notwhat.shared.auth.SocialAuthPayload
import com.notwhat.shared.notifications.AndroidPushTokenBridgeRegistry
import com.notwhat.shared.notifications.captureDeepLinkFromIntent
import com.notwhat.shared.ui.AndroidMediaPickerBridgeRegistry
import com.notwhat.shared.ui.NotWhatApp
import com.notwhat.shared.ui.initCoilForAndroid

class MainActivity : ComponentActivity() {
    private var pendingVideoCallback: ((String?) -> Unit)? = null
    private var pendingImageCallback: ((String?) -> Unit)? = null
    private var pendingMultiImageCallback: ((List<String>) -> Unit)? = null

    private val videoPickerLauncher =
        registerForActivityResult(
            PickVisualMedia(),
        ) { uri ->
            pendingVideoCallback?.invoke(uri?.toString())
            pendingVideoCallback = null
        }

    private val imagePickerLauncher =
        registerForActivityResult(
            PickVisualMedia(),
        ) { uri ->
            pendingImageCallback?.invoke(uri?.toString())
            pendingImageCallback = null
        }

    private val multiImagePickerLauncher =
        registerForActivityResult(
            PickMultipleVisualMedia(),
        ) { uris ->
            pendingMultiImageCallback?.invoke(uris.map { it.toString() })
            pendingMultiImageCallback = null
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(android.graphics.Color.BLACK),
            navigationBarStyle = SystemBarStyle.dark(android.graphics.Color.BLACK),
        )
        AndroidAppContextHolder.appContext = applicationContext
        initCoilForAndroid(applicationContext)

        AndroidSocialAuthBridgeRegistry.registerGoogleSignIn { _ ->
            launchGoogleSignIn()
        }

        AndroidMediaPickerBridgeRegistry.registerVideoPicker { callback ->
            pendingVideoCallback = callback
            videoPickerLauncher.launch(PickVisualMediaRequest(PickVisualMedia.VideoOnly))
        }

        AndroidMediaPickerBridgeRegistry.registerImagePicker { callback ->
            pendingImageCallback = callback
            imagePickerLauncher.launch(PickVisualMediaRequest(PickVisualMedia.ImageOnly))
        }

        AndroidMediaPickerBridgeRegistry.registerMultiImagePicker { callback ->
            pendingMultiImageCallback = callback
            multiImagePickerLauncher.launch(PickVisualMediaRequest(PickVisualMedia.ImageOnly))
        }

        val forcedRole = appRoleFromBuildConfig(BuildConfig.APP_ROLE)

        requestNotificationPermissionIfNeeded()
        fetchPushTokenIfAvailable()
        captureDeepLinkFromIntent(intent)

        setContent {
            NotWhatApp(forcedRole = forcedRole)
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        captureDeepLinkFromIntent(intent)
    }

    private val notificationPermissionLauncher = registerForActivityResult(RequestPermission()) { }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            notificationPermissionLauncher.launch(android.Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    /** No-ops until an Android app is registered for this Firebase project (google-services.json). */
    private fun fetchPushTokenIfAvailable() {
        if (FirebaseApp.getApps(applicationContext).isEmpty()) return

        try {
            FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    AndroidPushTokenBridgeRegistry.setToken(task.result)
                }
            }
        } catch (error: IllegalStateException) {
            // Firebase not configured for this build variant yet.
        }
    }

    override fun onBackPressed() {
        // Allow Compose to handle back navigation first
        // This prevents the app from closing and instead navigates back within the app
        super.onBackPressed()
    }

    override fun onDestroy() {
        if (isFinishing) {
            AndroidSocialAuthBridgeRegistry.registerGoogleSignIn(null)
            pendingVideoCallback = null
            pendingImageCallback = null
            pendingMultiImageCallback = null
        }
        super.onDestroy()
    }

    private suspend fun launchGoogleSignIn(): SocialAuthPayload {
        val serverClientId =
            googleServerClientId()
                ?: throw SharedAuthException(
                    "Google sign-in is not configured. Add NOTWHAT_GOOGLE_SERVER_CLIENT_ID to Android manifest placeholders.",
                )

        val credentialManager = CredentialManager.create(this)
        val googleIdOption =
            GetGoogleIdOption
                .Builder()
                .setServerClientId(serverClientId)
                .setFilterByAuthorizedAccounts(false)
                .setAutoSelectEnabled(false)
                .build()
        val request =
            GetCredentialRequest
                .Builder()
                .addCredentialOption(googleIdOption)
                .build()

        val result =
            try {
                credentialManager.getCredential(
                    context = this,
                    request = request,
                )
            } catch (error: GetCredentialException) {
                throw SharedAuthException(error.userMessage())
            }

        return result.toSocialPayload()
    }

    private fun GetCredentialException.userMessage(): String {
        if (this is GetCredentialCancellationException) {
            return "Credential Manager cancelled by user."
        }

        val message = errorMessage?.toString()?.trim().orEmpty()
        if (message.contains("cancel", ignoreCase = true)) {
            return "Google sign-in was cancelled."
        }
        return if (message.isEmpty()) "Credential Manager failed to return a credential." else "Credential Manager error: $message"
    }

    private fun GetCredentialResponse.toSocialPayload(): SocialAuthPayload {
        val customCredential =
            credential as? CustomCredential
                ?: throw SharedAuthException("Google sign-in failed: invalid credential result.")

        if (customCredential.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
            throw SharedAuthException("Google sign-in failed: unexpected credential type.")
        }

        val parsed =
            try {
                GoogleIdTokenCredential.createFrom(customCredential.data)
            } catch (error: GoogleIdTokenParsingException) {
                throw SharedAuthException(error.message ?: "Google sign-in failed: could not parse credential.")
            }

        val idToken = parsed.idToken
        if (idToken.isBlank()) {
            throw SharedAuthException("Google sign-in failed: empty ID token.")
        }

        val fullName =
            listOfNotNull(parsed.givenName, parsed.familyName)
                .joinToString(" ")
                .ifBlank { parsed.displayName }

        return SocialAuthPayload(idToken = idToken, fullName = fullName)
    }

    private fun googleServerClientId(): String? {
        val appInfo = packageManager.getApplicationInfo(packageName, android.content.pm.PackageManager.GET_META_DATA)
        val value = appInfo.metaData?.getString("com.notwhat.google.server_client_id")?.trim()
        return if (value.isNullOrEmpty()) null else value
    }
}

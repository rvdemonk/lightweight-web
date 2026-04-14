package xyz.rigby3.lightweight.data.auth

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import dagger.hilt.android.qualifiers.ApplicationContext
import xyz.rigby3.lightweight.BuildConfig
import javax.inject.Inject
import javax.inject.Singleton

data class GoogleSignInResult(
    val idToken: String,
    val displayName: String?,
    val email: String?,
)

@Singleton
class GoogleSignInHelper @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val credentialManager = CredentialManager.create(context)

    suspend fun getGoogleCredential(activityContext: Context): GoogleSignInResult {
        val googleIdOption = GetGoogleIdOption.Builder()
            .setFilterByAuthorizedAccounts(false)
            .setServerClientId(BuildConfig.GOOGLE_WEB_CLIENT_ID)
            .build()

        val request = GetCredentialRequest.Builder()
            .addCredentialOption(googleIdOption)
            .build()

        val result = credentialManager.getCredential(activityContext, request)
        val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(result.credential.data)
        return GoogleSignInResult(
            idToken = googleIdTokenCredential.idToken,
            displayName = googleIdTokenCredential.displayName,
            email = googleIdTokenCredential.id, // .id is the email
        )
    }
}

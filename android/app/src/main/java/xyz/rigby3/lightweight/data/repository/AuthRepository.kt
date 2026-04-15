package xyz.rigby3.lightweight.data.repository

import android.util.Log
import xyz.rigby3.lightweight.data.local.LightweightDatabase
import xyz.rigby3.lightweight.data.local.TokenStore
import xyz.rigby3.lightweight.data.remote.LightweightApi
import xyz.rigby3.lightweight.data.remote.dto.GoogleAuthRequest
import xyz.rigby3.lightweight.data.remote.dto.JoinRequest
import xyz.rigby3.lightweight.data.remote.dto.LoginRequest
import xyz.rigby3.lightweight.data.remote.dto.MeResponse
import xyz.rigby3.lightweight.data.remote.dto.RegisterRequest
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val api: LightweightApi,
    private val tokenStore: TokenStore,
    private val exerciseRepository: ExerciseRepository,
    private val db: LightweightDatabase,
    private val dataImportRepository: DataImportRepository,
) {
    val isLoggedIn: Boolean
        get() = tokenStore.isLoggedIn

    suspend fun login(username: String, password: String) {
        val response = api.login(LoginRequest(username, password))
        tokenStore.token = response.token
        tokenStore.userId = response.userId
        tokenStore.username = username
        migrateLocalDataIfNeeded(response.userId)
        exerciseRepository.seedIfEmpty()
    }

    suspend fun register(username: String, password: String, email: String?) {
        val response = api.register(RegisterRequest(username, password, email))
        tokenStore.token = response.token
        tokenStore.userId = response.userId
        tokenStore.username = username
        exerciseRepository.seedIfEmpty()
    }

    suspend fun join(username: String, password: String, inviteCode: String) {
        val response = api.join(inviteCode, JoinRequest(username, password))
        tokenStore.token = response.token
        tokenStore.userId = response.userId
        tokenStore.username = username
        exerciseRepository.seedIfEmpty()
    }

    suspend fun googleSignIn(idToken: String, displayName: String?, email: String?) {
        val response = api.googleAuth(GoogleAuthRequest(idToken))
        tokenStore.token = response.token
        tokenStore.userId = response.userId
        tokenStore.username = null
        tokenStore.displayName = displayName
        tokenStore.email = email
        migrateLocalDataIfNeeded(response.userId)
        exerciseRepository.seedIfEmpty()
    }

    suspend fun me(): MeResponse {
        val token = tokenStore.token ?: throw IllegalStateException("Not logged in")
        return api.me("Bearer $token")
    }

    suspend fun logout() {
        tokenStore.token?.let {
            try { api.logout("Bearer $it") } catch (_: Exception) { }
        }
        tokenStore.clear()
    }

    /**
     * If the local DB has no sessions for this user, pull from server.
     * Called separately from auth so the UI can show a sync animation.
     */
    suspend fun syncIfNeeded() {
        val userId = tokenStore.userId
        try {
            val count = db.sessionDao().countForUser(userId)
            if (count == 0) {
                Log.i("Auth", "No local sessions for user $userId, auto-importing from server")
                dataImportRepository.importFromServer()
            }
        } catch (e: Exception) {
            Log.w("Auth", "Auto-import failed: ${e.message}")
        }
    }

    /**
     * Safety net: if the device has data under the old hardcoded user_id=1
     * but the real server user_id differs, remap local data to the real ID.
     */
    private fun migrateLocalDataIfNeeded(realUserId: Long) {
        if (realUserId == 1L) return
        try {
            val sqlDb = db.openHelper.writableDatabase
            val tables = listOf("exercises", "sessions", "templates", "user_preferences")
            tables.forEach { table ->
                sqlDb.execSQL("UPDATE $table SET user_id = ? WHERE user_id = 1", arrayOf(realUserId))
            }
            Log.i("Auth", "Migrated local data from user_id=1 to user_id=$realUserId")
        } catch (e: Exception) {
            Log.w("Auth", "Local data migration skipped: ${e.message}")
        }
    }
}

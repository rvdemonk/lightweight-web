package xyz.rigby3.lightweight.data.repository

import xyz.rigby3.lightweight.data.local.TokenStore
import xyz.rigby3.lightweight.data.remote.LightweightApi
import xyz.rigby3.lightweight.data.remote.dto.JoinRequest
import xyz.rigby3.lightweight.data.remote.dto.LoginRequest
import xyz.rigby3.lightweight.data.remote.dto.RegisterRequest
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val api: LightweightApi,
    private val tokenStore: TokenStore,
    private val exerciseRepository: ExerciseRepository,
) {
    val isLoggedIn: Boolean
        get() = tokenStore.isLoggedIn

    suspend fun login(username: String, password: String) {
        val response = api.login(LoginRequest(username, password))
        tokenStore.token = response.token
        tokenStore.username = username
        exerciseRepository.seedIfEmpty()
    }

    suspend fun register(username: String, password: String) {
        val response = api.register(RegisterRequest(username, password))
        tokenStore.token = response.token
        tokenStore.username = username
        exerciseRepository.seedIfEmpty()
    }

    suspend fun join(username: String, password: String, inviteCode: String) {
        val response = api.join(JoinRequest(username, password, inviteCode))
        tokenStore.token = response.token
        tokenStore.username = username
        exerciseRepository.seedIfEmpty()
    }

    suspend fun logout() {
        tokenStore.token?.let {
            try { api.logout("Bearer $it") } catch (_: Exception) { }
        }
        tokenStore.clear()
    }
}

package xyz.rigby3.lightweight.data.repository

import xyz.rigby3.lightweight.data.remote.LightweightApi
import xyz.rigby3.lightweight.data.remote.dto.JoinRequest
import xyz.rigby3.lightweight.data.remote.dto.LoginRequest
import xyz.rigby3.lightweight.data.remote.dto.RegisterRequest
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val api: LightweightApi
) {
    // TODO: persist token in DataStore for survival across process death
    var token: String? = null
        private set

    val isLoggedIn: Boolean
        get() = token != null

    suspend fun login(username: String, password: String) {
        val response = api.login(LoginRequest(username, password))
        token = response.token
    }

    suspend fun register(username: String, password: String) {
        val response = api.register(RegisterRequest(username, password))
        token = response.token
    }

    suspend fun join(username: String, password: String, inviteCode: String) {
        val response = api.join(JoinRequest(username, password, inviteCode))
        token = response.token
    }

    suspend fun logout() {
        token?.let { api.logout("Bearer $it") }
        token = null
    }
}

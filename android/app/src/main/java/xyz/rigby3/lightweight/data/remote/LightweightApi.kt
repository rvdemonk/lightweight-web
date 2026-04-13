package xyz.rigby3.lightweight.data.remote

import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST
import xyz.rigby3.lightweight.data.remote.dto.AuthResponse
import xyz.rigby3.lightweight.data.remote.dto.JoinRequest
import xyz.rigby3.lightweight.data.remote.dto.LoginRequest
import xyz.rigby3.lightweight.data.remote.dto.RegisterRequest

interface LightweightApi {

    @POST("/api/auth/login")
    suspend fun login(@Body request: LoginRequest): AuthResponse

    @POST("/api/auth/register")
    suspend fun register(@Body request: RegisterRequest): AuthResponse

    @POST("/api/auth/join")
    suspend fun join(@Body request: JoinRequest): AuthResponse

    @POST("/api/auth/logout")
    suspend fun logout(@Header("Authorization") token: String)
}

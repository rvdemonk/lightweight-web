package xyz.rigby3.lightweight.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class LoginRequest(
    val username: String,
    val password: String
)

@Serializable
data class RegisterRequest(
    val username: String,
    val password: String
)

@Serializable
data class JoinRequest(
    val username: String,
    val password: String,
    @SerialName("invite_code")
    val inviteCode: String
)

@Serializable
data class AuthResponse(
    val token: String
)

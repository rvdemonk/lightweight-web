package xyz.rigby3.lightweight.data.remote

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query
import xyz.rigby3.lightweight.data.remote.dto.AddSessionExerciseDto
import xyz.rigby3.lightweight.data.remote.dto.AuthResponse
import xyz.rigby3.lightweight.data.remote.dto.CreateSessionDto
import xyz.rigby3.lightweight.data.remote.dto.CreateSetDto
import xyz.rigby3.lightweight.data.remote.dto.GoogleAuthRequest
import xyz.rigby3.lightweight.data.remote.dto.ExerciseDto
import xyz.rigby3.lightweight.data.remote.dto.JoinRequest
import xyz.rigby3.lightweight.data.remote.dto.LoginRequest
import xyz.rigby3.lightweight.data.remote.dto.RegisterRequest
import xyz.rigby3.lightweight.data.remote.dto.SessionDto
import xyz.rigby3.lightweight.data.remote.dto.SessionExerciseDto
import xyz.rigby3.lightweight.data.remote.dto.SessionSummaryDto
import xyz.rigby3.lightweight.data.remote.dto.SetDto
import xyz.rigby3.lightweight.data.remote.dto.TemplateDto

interface LightweightApi {

    // Auth
    @POST("/api/v1/auth/login")
    suspend fun login(@Body request: LoginRequest): AuthResponse

    @POST("/api/v1/auth/register")
    suspend fun register(@Body request: RegisterRequest): AuthResponse

    @POST("/api/v1/auth/join/{code}")
    suspend fun join(@Path("code") code: String, @Body request: JoinRequest): AuthResponse

    @POST("/api/v1/auth/google")
    suspend fun googleAuth(@Body request: GoogleAuthRequest): AuthResponse

    @POST("/api/v1/auth/logout")
    suspend fun logout(@Header("Authorization") token: String)

    // Exercises
    @GET("/api/v1/exercises")
    suspend fun getExercises(@Header("Authorization") token: String): List<ExerciseDto>

    // Templates
    @GET("/api/v1/templates")
    suspend fun getTemplates(@Header("Authorization") token: String): List<TemplateDto>

    // Sessions
    @GET("/api/v1/sessions")
    suspend fun getSessions(
        @Header("Authorization") token: String,
        @Query("limit") limit: Int = 1000,
        @Query("offset") offset: Int = 0,
    ): List<SessionSummaryDto>

    @GET("/api/v1/sessions/{id}")
    suspend fun getSession(
        @Header("Authorization") token: String,
        @Path("id") id: Long,
    ): SessionDto

    // Sync (push) — individual endpoints preserve full session data
    @POST("/api/v1/sessions")
    suspend fun createSession(
        @Header("Authorization") token: String,
        @Body body: CreateSessionDto,
    ): SessionDto

    @POST("/api/v1/sessions/{sid}/exercises")
    suspend fun addSessionExercise(
        @Header("Authorization") token: String,
        @Path("sid") sessionId: Long,
        @Body body: AddSessionExerciseDto,
    ): SessionExerciseDto

    @POST("/api/v1/sessions/{sid}/exercises/{seid}/sets")
    suspend fun addSet(
        @Header("Authorization") token: String,
        @Path("sid") sessionId: Long,
        @Path("seid") sessionExerciseId: Long,
        @Body body: CreateSetDto,
    ): SetDto
}

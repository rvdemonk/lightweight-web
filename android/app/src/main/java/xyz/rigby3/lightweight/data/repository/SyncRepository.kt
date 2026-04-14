package xyz.rigby3.lightweight.data.repository

import android.util.Log
import xyz.rigby3.lightweight.data.local.LightweightDatabase
import xyz.rigby3.lightweight.data.local.TokenStore
import xyz.rigby3.lightweight.data.remote.LightweightApi
import xyz.rigby3.lightweight.data.remote.dto.SyncExerciseDto
import xyz.rigby3.lightweight.data.remote.dto.SyncSessionDto
import xyz.rigby3.lightweight.data.remote.dto.SyncSetDto
import javax.inject.Inject
import javax.inject.Singleton

data class SyncResult(
    val pushed: Int,
    val skipped: Int = 0,
    val errors: List<String> = emptyList(),
)

@Singleton
class SyncRepository @Inject constructor(
    private val api: LightweightApi,
    private val db: LightweightDatabase,
    private val tokenStore: TokenStore,
    private val dataImportRepository: DataImportRepository,
) {
    private val userId get() = tokenStore.userId

    /**
     * Push unsynced completed sessions to the server via atomic sync endpoint.
     *
     * The server deduplicates by started_at timestamp and resolves exercises
     * by name — no need for client-side exercise ID mapping or multi-step calls.
     */
    suspend fun pushUnsyncedSessions(): SyncResult {
        val token = "Bearer ${tokenStore.token ?: throw IllegalStateException("Not logged in")}"
        val sessionDao = db.sessionDao()

        val unsynced = sessionDao.getUnsyncedCompleted(userId)
        if (unsynced.isEmpty()) return SyncResult(pushed = 0)

        // Build full session payloads
        val payloads = unsynced.map { session ->
            val exerciseRows = sessionDao.getExercisesWithSets(session.id)
            val exerciseGroups = exerciseRows.groupBy { it.seId }

            val exercises = exerciseGroups.map { (_, rows) ->
                val first = rows.first()
                SyncExerciseDto(
                    name = first.exerciseName,
                    position = first.position,
                    notes = first.seNotes,
                    sets = rows.filter { it.setId != null }.map { row ->
                        SyncSetDto(
                            weightKg = row.weightKg,
                            reps = row.reps ?: 0,
                            setType = row.setType,
                            rir = row.rir,
                            completedAt = row.completedAt,
                        )
                    },
                )
            }

            SyncSessionDto(
                name = session.name,
                startedAt = session.startedAt,
                endedAt = session.endedAt,
                pausedDuration = session.pausedDuration.toLong(),
                status = session.status,
                notes = session.notes,
                exercises = exercises,
            )
        }

        return try {
            val result = api.syncSessions(token, payloads)

            // Mark all local sessions as synced
            for (session in unsynced) {
                sessionDao.markSynced(session.id)
            }

            val pushed = result.pushed.size
            val skipped = result.skipped.toInt()
            Log.i("Sync", "Pushed $pushed, skipped $skipped (already on server)")
            if (result.exercisesCreated.isNotEmpty()) {
                Log.i("Sync", "Created exercises: ${result.exercisesCreated.joinToString()}")
            }

            SyncResult(pushed = pushed, skipped = skipped)
        } catch (e: Exception) {
            Log.w("Sync", "Sync failed: ${e.message}")
            SyncResult(pushed = 0, errors = listOf(e.message ?: "Unknown error"))
        }
    }

    /**
     * Sync: push local sessions to server. No pull — phone is source of truth.
     * Pull only happens via DataImportRepository on first login.
     */
    suspend fun sync(onProgress: (ImportProgress) -> Unit = {}): SyncResult {
        onProgress(ImportProgress("Pushing local data", 0, 0))
        return pushUnsyncedSessions()
    }
}

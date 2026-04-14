package xyz.rigby3.lightweight.data.repository

import android.util.Log
import xyz.rigby3.lightweight.data.local.LightweightDatabase
import xyz.rigby3.lightweight.data.local.TokenStore
import xyz.rigby3.lightweight.data.remote.LightweightApi
import xyz.rigby3.lightweight.data.remote.dto.AddSessionExerciseDto
import xyz.rigby3.lightweight.data.remote.dto.CreateSessionDto
import xyz.rigby3.lightweight.data.remote.dto.CreateSetDto
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
     * Push unsynced completed sessions to the server. Deduplicates against
     * server by started_at timestamp to prevent re-uploading sessions that
     * already exist (e.g. from a previous import or web-logged sessions).
     */
    suspend fun pushUnsyncedSessions(): SyncResult {
        val token = "Bearer ${tokenStore.token ?: throw IllegalStateException("Not logged in")}"
        val sessionDao = db.sessionDao()

        val unsynced = sessionDao.getUnsyncedCompleted(userId)
        if (unsynced.isEmpty()) return SyncResult(pushed = 0)

        // Fetch server session timestamps for dedup
        val serverSummaries = api.getSessions(token, limit = 2000)
        val serverTimestamps = serverSummaries.map { it.startedAt }.toSet()

        val errors = mutableListOf<String>()
        var pushed = 0
        var skipped = 0

        for (session in unsynced) {
            // Skip if server already has a session with this started_at
            if (session.startedAt in serverTimestamps) {
                sessionDao.markSynced(session.id)
                skipped++
                Log.i("Sync", "Skipped session ${session.id} (${session.name}) — already on server")
                continue
            }

            try {
                // 1. Create session on server
                val created = api.createSession(token, CreateSessionDto(
                    templateId = session.templateId,
                    name = session.name,
                    startedAt = session.startedAt,
                    endedAt = session.endedAt,
                    status = session.status,
                    notes = session.notes,
                    pausedDuration = session.pausedDuration.toLong(),
                ))
                val serverId = created.id

                // 2. Add exercises and sets
                val exerciseRows = sessionDao.getExercisesWithSets(session.id)
                val exerciseGroups = exerciseRows.groupBy { it.seId }

                for ((_, rows) in exerciseGroups) {
                    val first = rows.first()

                    val serverExercise = api.addSessionExercise(token, serverId,
                        AddSessionExerciseDto(
                            exerciseId = first.exerciseId,
                            position = first.position,
                            notes = first.seNotes,
                        )
                    )

                    // 3. Add sets for this exercise
                    for (row in rows.filter { it.setId != null }) {
                        api.addSet(token, serverId, serverExercise.id,
                            CreateSetDto(
                                weightKg = row.weightKg,
                                reps = row.reps ?: 0,
                                setType = row.setType,
                                rir = row.rir,
                            )
                        )
                    }
                }

                sessionDao.markSynced(session.id)
                pushed++
                Log.i("Sync", "Pushed session ${session.id} (${session.name})")
            } catch (e: Exception) {
                Log.w("Sync", "Failed to push session ${session.id}: ${e.message}")
                errors.add("${session.name}: ${e.message}")
            }
        }

        return SyncResult(pushed = pushed, skipped = skipped, errors = errors)
    }

    /**
     * Full sync: push unsynced sessions, then pull everything from server.
     */
    suspend fun sync(onProgress: (ImportProgress) -> Unit = {}): SyncResult {
        val pushResult = pushUnsyncedSessions()
        dataImportRepository.importFromServer(onProgress)
        return pushResult
    }
}

package xyz.rigby3.lightweight.data.repository

import android.util.Log
import androidx.room.withTransaction
import xyz.rigby3.lightweight.data.local.LightweightDatabase
import xyz.rigby3.lightweight.data.local.TokenStore
import xyz.rigby3.lightweight.data.local.entity.ExerciseEntity
import xyz.rigby3.lightweight.data.local.entity.SessionEntity
import xyz.rigby3.lightweight.data.local.entity.SessionExerciseEntity
import xyz.rigby3.lightweight.data.local.entity.SetEntity
import xyz.rigby3.lightweight.data.local.entity.TemplateEntity
import xyz.rigby3.lightweight.data.local.entity.TemplateExerciseEntity
import xyz.rigby3.lightweight.data.remote.LightweightApi
import xyz.rigby3.lightweight.data.remote.dto.SessionDto
import javax.inject.Inject
import javax.inject.Singleton

data class ImportProgress(
    val phase: String,
    val current: Int = 0,
    val total: Int = 0,
)

data class ImportResult(
    val exercises: Int,
    val templates: Int,
    val sessions: Int,
    val sets: Int,
)

@Singleton
class DataImportRepository @Inject constructor(
    private val api: LightweightApi,
    private val db: LightweightDatabase,
    private val tokenStore: TokenStore,
) {
    private val userId get() = tokenStore.userId

    suspend fun importFromServer(
        onProgress: (ImportProgress) -> Unit = {},
    ): ImportResult {
        val token = "Bearer ${tokenStore.token ?: throw IllegalStateException("Not logged in")}"

        // 1. Fetch exercises
        onProgress(ImportProgress("Fetching exercises"))
        val exercises = api.getExercises(token)

        // 2. Fetch templates (includes exercises)
        onProgress(ImportProgress("Fetching templates"))
        val templates = api.getTemplates(token)

        // 3. Fetch session list
        onProgress(ImportProgress("Fetching session list"))
        val summaries = api.getSessions(token, limit = 2000)

        // 4. Fetch each session's full detail
        val sessions = mutableListOf<SessionDto>()
        summaries.forEachIndexed { i, summary ->
            onProgress(ImportProgress("Fetching sessions", i + 1, summaries.size))
            try {
                sessions.add(api.getSession(token, summary.id))
            } catch (e: Exception) {
                Log.w("DataImport", "Skipping session ${summary.id}: ${e.message}")
            }
        }

        // 5. Insert everything in a single transaction
        onProgress(ImportProgress("Writing to database"))
        var totalSets = 0

        db.withTransaction {
            val exerciseDao = db.exerciseDao()
            val templateDao = db.templateDao()
            val sessionDao = db.sessionDao()
            val setDao = db.setDao()

            // Clear existing data (cascade handles children)
            sessionDao.deleteAll(userId)
            templateDao.deleteAll(userId)
            exerciseDao.deleteAll(userId)

            // Insert exercises with server IDs
            exerciseDao.insertAll(exercises.map { e ->
                ExerciseEntity(
                    id = e.id,
                    userId = userId,
                    name = e.name,
                    muscleGroup = e.muscleGroup,
                    equipment = e.equipment,
                    notes = e.notes,
                    archived = e.archived,
                    createdAt = e.createdAt,
                )
            })

            // Insert templates with server IDs
            for (t in templates) {
                templateDao.insert(TemplateEntity(
                    id = t.id,
                    userId = userId,
                    name = t.name,
                    notes = t.notes,
                    archived = t.archived,
                    createdAt = t.createdAt,
                    updatedAt = t.updatedAt,
                    version = t.version,
                ))
                templateDao.insertExercises(t.exercises.map { te ->
                    TemplateExerciseEntity(
                        id = te.id,
                        templateId = t.id,
                        exerciseId = te.exerciseId,
                        position = te.position,
                        targetSets = te.targetSets,
                        targetRepsMin = te.targetRepsMin,
                        targetRepsMax = te.targetRepsMax,
                        restSeconds = te.restSeconds,
                        notes = te.notes,
                    )
                })
            }

            // Insert sessions with exercises and sets
            for (s in sessions) {
                sessionDao.insert(SessionEntity(
                    id = s.id,
                    userId = userId,
                    templateId = s.templateId,
                    name = s.name ?: s.templateName ?: "Workout",
                    startedAt = s.startedAt,
                    endedAt = s.endedAt,
                    pausedDuration = s.pausedDuration.toInt(),
                    notes = s.notes,
                    status = s.status,
                    templateVersion = s.templateVersion,
                ))
                for (se in s.exercises) {
                    sessionDao.insertExercise(SessionExerciseEntity(
                        id = se.id,
                        sessionId = s.id,
                        exerciseId = se.exerciseId,
                        position = se.position,
                        notes = se.notes,
                    ))
                    if (se.sets.isNotEmpty()) {
                        setDao.insertAll(se.sets.map { set ->
                            SetEntity(
                                id = set.id,
                                sessionExerciseId = se.id,
                                setNumber = set.setNumber,
                                weightKg = set.weightKg,
                                reps = set.reps,
                                setType = set.setType,
                                rir = set.rir,
                                completedAt = set.completedAt,
                            )
                        })
                        totalSets += se.sets.size
                    }
                }
            }
        }

        return ImportResult(
            exercises = exercises.size,
            templates = templates.size,
            sessions = sessions.size,
            sets = totalSets,
        )
    }
}

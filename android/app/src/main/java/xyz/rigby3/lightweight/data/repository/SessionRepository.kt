package xyz.rigby3.lightweight.data.repository

import kotlinx.coroutines.flow.Flow
import xyz.rigby3.lightweight.data.local.TokenStore
import xyz.rigby3.lightweight.data.local.dao.SessionDao
import xyz.rigby3.lightweight.data.local.dao.SetDao
import xyz.rigby3.lightweight.data.local.entity.SessionEntity
import xyz.rigby3.lightweight.data.local.entity.SessionExerciseEntity
import xyz.rigby3.lightweight.data.local.entity.SetEntity
import xyz.rigby3.lightweight.data.local.entity.TemplateEntity
import xyz.rigby3.lightweight.data.local.entity.TemplateExerciseEntity
import xyz.rigby3.lightweight.data.local.row.SessionExerciseSetRow
import xyz.rigby3.lightweight.domain.model.Session
import xyz.rigby3.lightweight.domain.model.SessionExercise
import xyz.rigby3.lightweight.domain.model.WorkoutSet
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SessionRepository @Inject constructor(
    private val sessionDao: SessionDao,
    private val setDao: SetDao
) {
    private val userId = TokenStore.LOCAL_USER_ID

    fun getAll(): Flow<List<SessionEntity>> =
        sessionDao.getAll(userId)

    suspend fun getActive(): SessionEntity? =
        sessionDao.getActive(userId)

    suspend fun getById(id: Long): SessionEntity? =
        sessionDao.getById(id)

    suspend fun create(session: SessionEntity): Long =
        sessionDao.insert(session)

    suspend fun update(session: SessionEntity) =
        sessionDao.update(session)

    suspend fun delete(id: Long) =
        sessionDao.delete(id)

    suspend fun getExercises(sessionId: Long): List<SessionExerciseEntity> =
        sessionDao.getExercises(sessionId)

    suspend fun addExercise(exercise: SessionExerciseEntity): Long =
        sessionDao.insertExercise(exercise)

    suspend fun addSet(set: SetEntity): Long =
        setDao.insert(set)

    suspend fun updateSet(set: SetEntity) =
        setDao.update(set)

    suspend fun deleteSet(id: Long) =
        setDao.delete(id)

    // --- Session creation ---

    suspend fun createFromTemplate(
        template: TemplateEntity,
        exercises: List<TemplateExerciseEntity>,
    ): Long {
        val sessionId = sessionDao.insert(
            SessionEntity(
                userId = userId,
                templateId = template.id,
                name = template.name,
                startedAt = java.time.Instant.now().toString(),
                status = "active",
                templateVersion = template.version,
            )
        )
        exercises.forEachIndexed { index, te ->
            sessionDao.insertExercise(
                SessionExerciseEntity(
                    sessionId = sessionId,
                    exerciseId = te.exerciseId,
                    position = index + 1,
                )
            )
        }
        return sessionId
    }

    suspend fun createFreeform(): Long {
        return sessionDao.insert(
            SessionEntity(
                userId = userId,
                name = "Freeform",
                startedAt = java.time.Instant.now().toString(),
                status = "active",
            )
        )
    }

    // --- Full session loading (domain model) ---

    suspend fun getActiveSession(): Session? {
        val entity = sessionDao.getActive(userId) ?: return null
        return loadFullSession(entity)
    }

    suspend fun getFullSession(id: Long): Session? {
        val entity = sessionDao.getById(id) ?: return null
        return loadFullSession(entity)
    }

    private fun mapToSession(entity: SessionEntity, rows: List<SessionExerciseSetRow>): Session {
        val exercises = rows.groupBy { it.seId }.map { (seId, group) ->
            val first = group.first()
            SessionExercise(
                id = seId,
                exerciseId = first.exerciseId,
                exerciseName = first.exerciseName,
                position = first.position,
                notes = first.seNotes,
                sets = group.filter { it.setId != null }.map { row ->
                    WorkoutSet(
                        id = row.setId!!,
                        setNumber = row.setNumber!!,
                        weightKg = row.weightKg,
                        reps = row.reps,
                        setType = row.setType ?: "working",
                        rir = row.rir,
                        completedAt = row.completedAt,
                    )
                }.sortedBy { it.setNumber }
            )
        }.sortedBy { it.position }

        return Session(
            id = entity.id,
            templateId = entity.templateId,
            templateName = entity.name,
            name = entity.name,
            startedAt = entity.startedAt,
            endedAt = entity.endedAt,
            pausedDuration = entity.pausedDuration,
            notes = entity.notes,
            status = entity.status,
            templateVersion = entity.templateVersion,
            exercises = exercises,
        )
    }

    private suspend fun loadFullSession(entity: SessionEntity): Session {
        val rows = sessionDao.getExercisesWithSets(entity.id)
        return mapToSession(entity, rows)
    }

    // --- Status & metadata updates ---

    suspend fun updateStatus(sessionId: Long, status: String) =
        sessionDao.updateStatus(sessionId, status)

    suspend fun updatePausedDuration(sessionId: Long, duration: Int) =
        sessionDao.updatePausedDuration(sessionId, duration)

    suspend fun updateExerciseNotes(sessionExerciseId: Long, notes: String?) =
        sessionDao.updateExerciseNotes(sessionExerciseId, notes)

    suspend fun deleteIfEmpty(sessionId: Long) =
        sessionDao.deleteIfEmpty(sessionId)
}

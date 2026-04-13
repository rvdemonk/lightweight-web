package xyz.rigby3.lightweight.data.repository

import kotlinx.coroutines.flow.Flow
import xyz.rigby3.lightweight.data.local.dao.SessionDao
import xyz.rigby3.lightweight.data.local.dao.SetDao
import xyz.rigby3.lightweight.data.local.entity.SessionEntity
import xyz.rigby3.lightweight.data.local.entity.SessionExerciseEntity
import xyz.rigby3.lightweight.data.local.entity.SetEntity
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SessionRepository @Inject constructor(
    private val sessionDao: SessionDao,
    private val setDao: SetDao
) {
    fun getAll(userId: Long): Flow<List<SessionEntity>> =
        sessionDao.getAll(userId)

    suspend fun getActive(userId: Long): SessionEntity? =
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
}

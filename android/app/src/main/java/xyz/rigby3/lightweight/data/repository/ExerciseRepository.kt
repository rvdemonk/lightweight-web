package xyz.rigby3.lightweight.data.repository

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import xyz.rigby3.lightweight.data.local.SeedData
import xyz.rigby3.lightweight.data.local.TokenStore
import xyz.rigby3.lightweight.data.local.dao.ExerciseDao
import xyz.rigby3.lightweight.data.local.entity.ExerciseEntity
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ExerciseRepository @Inject constructor(
    private val exerciseDao: ExerciseDao
) {
    private val userId = TokenStore.LOCAL_USER_ID

    fun getAll(): Flow<List<ExerciseEntity>> =
        exerciseDao.getAll(userId)

    suspend fun getById(id: Long): ExerciseEntity? =
        exerciseDao.getById(id)

    suspend fun save(exercise: ExerciseEntity): Long =
        exerciseDao.insert(exercise)

    suspend fun archive(id: Long) =
        exerciseDao.archive(id)

    /** Seed default exercises if the local DB is empty. Called on first login. */
    suspend fun seedIfEmpty() {
        val existing = exerciseDao.getAll(userId).first()
        if (existing.isEmpty()) {
            SeedData.exercises(userId).forEach { exerciseDao.insert(it) }
        }
    }
}

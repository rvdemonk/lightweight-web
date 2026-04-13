package xyz.rigby3.lightweight.data.repository

import kotlinx.coroutines.flow.Flow
import xyz.rigby3.lightweight.data.local.dao.ExerciseDao
import xyz.rigby3.lightweight.data.local.entity.ExerciseEntity
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ExerciseRepository @Inject constructor(
    private val exerciseDao: ExerciseDao
) {
    fun getAll(userId: Long): Flow<List<ExerciseEntity>> =
        exerciseDao.getAll(userId)

    suspend fun getById(id: Long): ExerciseEntity? =
        exerciseDao.getById(id)

    suspend fun save(exercise: ExerciseEntity): Long =
        exerciseDao.insert(exercise)

    suspend fun archive(id: Long) =
        exerciseDao.archive(id)
}

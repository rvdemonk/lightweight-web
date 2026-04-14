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
    private val exerciseDao: ExerciseDao,
    private val tokenStore: TokenStore,
) {
    private val userId get() = tokenStore.userId

    fun getAll(): Flow<List<ExerciseEntity>> =
        exerciseDao.getAll(userId)

    suspend fun getById(id: Long): ExerciseEntity? =
        exerciseDao.getById(id)

    suspend fun save(exercise: ExerciseEntity): Long =
        exerciseDao.insert(exercise)

    suspend fun archive(id: Long) =
        exerciseDao.archive(id)

    /**
     * Ensure the full exercise library exists.
     * - New users: inserts all 92 exercises.
     * - Existing users: inserts missing exercises (IGNORE conflicts),
     *   then backfills short_name on any exercise that matches by name.
     */
    suspend fun seedIfEmpty() {
        val seedExercises = SeedData.exercises(userId)

        // Insert all seed exercises — IGNORE conflicts on (user_id, name)
        seedExercises.forEach { exerciseDao.insertIgnore(it) }

        // Backfill short_name for exercises that already existed
        SeedData.shortNameMap.forEach { (name, shortName) ->
            exerciseDao.backfillShortName(userId, name, shortName)
        }
    }
}

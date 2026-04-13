package xyz.rigby3.lightweight.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow
import xyz.rigby3.lightweight.data.local.entity.ExerciseEntity

@Dao
interface ExerciseDao {

    @Query("SELECT * FROM exercises WHERE user_id = :userId AND archived = 0 ORDER BY name")
    fun getAll(userId: Long): Flow<List<ExerciseEntity>>

    @Query("SELECT * FROM exercises WHERE id = :id")
    suspend fun getById(id: Long): ExerciseEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(exercise: ExerciseEntity): Long

    @Update
    suspend fun update(exercise: ExerciseEntity)

    @Query("UPDATE exercises SET archived = 1 WHERE id = :id")
    suspend fun archive(id: Long)
}

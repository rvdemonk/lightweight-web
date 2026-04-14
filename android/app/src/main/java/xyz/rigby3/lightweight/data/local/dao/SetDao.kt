package xyz.rigby3.lightweight.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow
import xyz.rigby3.lightweight.data.local.entity.SetEntity

@Dao
interface SetDao {

    @Query("SELECT * FROM sets WHERE session_exercise_id = :sessionExerciseId ORDER BY set_number")
    fun getBySessionExercise(sessionExerciseId: Long): Flow<List<SetEntity>>

    @Query("SELECT * FROM sets WHERE session_exercise_id = :sessionExerciseId ORDER BY set_number")
    suspend fun getBySessionExerciseOnce(sessionExerciseId: Long): List<SetEntity>

    @Query("SELECT COALESCE(MAX(set_number), 0) FROM sets WHERE session_exercise_id = :sessionExerciseId")
    suspend fun maxSetNumber(sessionExerciseId: Long): Int

    @Insert
    suspend fun insert(set: SetEntity): Long

    @Update
    suspend fun update(set: SetEntity)

    @Query("DELETE FROM sets WHERE id = :id")
    suspend fun delete(id: Long)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(sets: List<SetEntity>)
}

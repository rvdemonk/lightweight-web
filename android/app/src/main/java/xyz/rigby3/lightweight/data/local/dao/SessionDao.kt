package xyz.rigby3.lightweight.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow
import xyz.rigby3.lightweight.data.local.entity.SessionEntity
import xyz.rigby3.lightweight.data.local.entity.SessionExerciseEntity

@Dao
interface SessionDao {

    @Query("SELECT * FROM sessions WHERE user_id = :userId ORDER BY started_at DESC")
    fun getAll(userId: Long): Flow<List<SessionEntity>>

    @Query("SELECT * FROM sessions WHERE user_id = :userId AND status IN ('active', 'paused')")
    suspend fun getActive(userId: Long): SessionEntity?

    @Query("SELECT * FROM sessions WHERE id = :id")
    suspend fun getById(id: Long): SessionEntity?

    @Query("SELECT * FROM session_exercises WHERE session_id = :sessionId ORDER BY position")
    suspend fun getExercises(sessionId: Long): List<SessionExerciseEntity>

    @Insert
    suspend fun insert(session: SessionEntity): Long

    @Update
    suspend fun update(session: SessionEntity)

    @Insert
    suspend fun insertExercise(exercise: SessionExerciseEntity): Long

    @Query("DELETE FROM sessions WHERE id = :id")
    suspend fun delete(id: Long)
}

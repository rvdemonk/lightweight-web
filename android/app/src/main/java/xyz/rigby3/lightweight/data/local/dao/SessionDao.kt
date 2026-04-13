package xyz.rigby3.lightweight.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow
import xyz.rigby3.lightweight.data.local.entity.SessionEntity
import xyz.rigby3.lightweight.data.local.entity.SessionExerciseEntity
import xyz.rigby3.lightweight.data.local.row.SessionExerciseSetRow
import xyz.rigby3.lightweight.data.local.row.SessionSummaryRow

@Dao
interface SessionDao {

    @Query("SELECT * FROM sessions WHERE user_id = :userId ORDER BY started_at DESC")
    fun getAll(userId: Long): Flow<List<SessionEntity>>

    @Query("SELECT * FROM sessions WHERE user_id = :userId AND status IN ('active', 'paused') ORDER BY started_at DESC LIMIT 1")
    suspend fun getActive(userId: Long): SessionEntity?

    @Query("UPDATE sessions SET status = 'abandoned' WHERE user_id = :userId AND status IN ('active', 'paused')")
    suspend fun abandonAll(userId: Long)

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

    @Query("""
        SELECT se.id as se_id, se.exercise_id, e.name as exercise_name, se.position, se.notes as se_notes,
               st.id as set_id, st.set_number, st.weight_kg, st.reps, st.set_type, st.rir, st.completed_at
        FROM session_exercises se
        JOIN exercises e ON e.id = se.exercise_id
        LEFT JOIN sets st ON st.session_exercise_id = se.id
        WHERE se.session_id = :sessionId
        ORDER BY se.position, st.set_number
    """)
    suspend fun getExercisesWithSets(sessionId: Long): List<SessionExerciseSetRow>

    @Query("""
        SELECT s.id, s.template_id, s.name, s.started_at, s.ended_at, s.status, s.paused_duration,
               (SELECT COUNT(*) FROM session_exercises WHERE session_id = s.id) as exercise_count,
               (SELECT COUNT(*) FROM sets st JOIN session_exercises se ON se.id = st.session_exercise_id WHERE se.session_id = s.id) as set_count
        FROM sessions s
        WHERE s.user_id = :userId
        ORDER BY s.started_at DESC
        LIMIT :limit OFFSET :offset
    """)
    suspend fun getSummaries(userId: Long, limit: Int, offset: Int = 0): List<SessionSummaryRow>

    @Query("UPDATE sessions SET status = :status, ended_at = CASE WHEN :status IN ('completed', 'abandoned') THEN datetime('now') ELSE ended_at END WHERE id = :id")
    suspend fun updateStatus(id: Long, status: String)

    @Query("UPDATE sessions SET paused_duration = :pausedDuration WHERE id = :id")
    suspend fun updatePausedDuration(id: Long, pausedDuration: Int)

    @Query("UPDATE session_exercises SET notes = :notes WHERE id = :id")
    suspend fun updateExerciseNotes(id: Long, notes: String?)

    @Query("""
        DELETE FROM sessions WHERE id = :id
        AND (SELECT COUNT(*) FROM sets st JOIN session_exercises se ON se.id = st.session_exercise_id WHERE se.session_id = :id) = 0
    """)
    suspend fun deleteIfEmpty(id: Long)

    @Query("DELETE FROM sessions WHERE user_id = :userId")
    suspend fun deleteAll(userId: Long)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(sessions: List<SessionEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertExercises(exercises: List<SessionExerciseEntity>)
}

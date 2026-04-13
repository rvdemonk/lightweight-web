package xyz.rigby3.lightweight.data.local.dao

import androidx.room.Dao
import androidx.room.Query
import xyz.rigby3.lightweight.data.local.row.DayActivityRow
import xyz.rigby3.lightweight.data.local.row.ExerciseSetHistoryRow
import xyz.rigby3.lightweight.data.local.row.PreviousSetRow

@Dao
interface AnalyticsDao {

    @Query("""
        SELECT date(s.started_at) as date, COUNT(st.id) as set_count
        FROM sessions s
        JOIN session_exercises se ON se.session_id = s.id
        JOIN sets st ON st.session_exercise_id = se.id
        WHERE s.user_id = :userId AND s.status = 'completed'
          AND s.started_at >= date('now', '-' || :days || ' days')
        GROUP BY date(s.started_at)
        ORDER BY date(s.started_at)
    """)
    suspend fun getActivityHeatmap(userId: Long, days: Int): List<DayActivityRow>

    @Query("""
        SELECT st.weight_kg, st.reps, st.rir, st.set_number
        FROM sets st
        JOIN session_exercises se ON se.id = st.session_exercise_id
        JOIN sessions s ON s.id = se.session_id
        WHERE se.exercise_id = :exerciseId AND s.user_id = :userId
          AND s.status = 'completed' AND s.id != :excludeSessionId
        ORDER BY s.started_at DESC, st.set_number
        LIMIT 20
    """)
    suspend fun getPreviousSets(userId: Long, exerciseId: Long, excludeSessionId: Long): List<PreviousSetRow>

    @Query("""
        SELECT st.set_number, st.weight_kg, st.reps, st.rir, date(s.started_at) as date
        FROM sets st
        JOIN session_exercises se ON se.id = st.session_exercise_id
        JOIN sessions s ON s.id = se.session_id
        WHERE se.exercise_id = :exerciseId AND s.user_id = :userId
          AND s.status = 'completed' AND st.weight_kg IS NOT NULL AND st.reps IS NOT NULL
        ORDER BY s.started_at, st.set_number
    """)
    suspend fun getAllSetsForExercise(userId: Long, exerciseId: Long): List<ExerciseSetHistoryRow>
}

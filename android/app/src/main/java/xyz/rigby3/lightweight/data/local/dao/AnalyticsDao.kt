package xyz.rigby3.lightweight.data.local.dao

import androidx.room.Dao
import androidx.room.Query
import xyz.rigby3.lightweight.data.local.row.AllExerciseSetRow
import xyz.rigby3.lightweight.data.local.row.DayActivityRow
import xyz.rigby3.lightweight.data.local.row.ExerciseSetHistoryRow
import xyz.rigby3.lightweight.data.local.row.ExerciseWithSessionCountRow
import xyz.rigby3.lightweight.data.local.row.PreviousSetRow
import xyz.rigby3.lightweight.data.local.row.StrengthTrendRow
import xyz.rigby3.lightweight.data.local.row.WeeklyFrequencyRow
import xyz.rigby3.lightweight.data.local.row.WeeklyVolumeRow

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
        WHERE se.session_id = (
            SELECT s.id FROM sessions s
            JOIN session_exercises se2 ON se2.session_id = s.id
            WHERE se2.exercise_id = :exerciseId AND s.user_id = :userId
              AND s.status = 'completed' AND s.id != :excludeSessionId
              AND EXISTS (SELECT 1 FROM sets st2 WHERE st2.session_exercise_id = se2.id)
            ORDER BY s.started_at DESC
            LIMIT 1
        )
        AND se.exercise_id = :exerciseId
        ORDER BY st.set_number
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

    @Query("""
        SELECT date(s.started_at, '+1 day', 'weekday 1', '-7 days') AS week,
               COALESCE(e.muscle_group, 'Other') AS muscle_group,
               COUNT(*) AS set_count
        FROM sets st
        JOIN session_exercises se ON se.id = st.session_exercise_id
        JOIN sessions s ON s.id = se.session_id
        JOIN exercises e ON e.id = se.exercise_id
        WHERE s.user_id = :userId AND s.status = 'completed'
          AND st.set_type = 'working'
          AND s.started_at >= date('now', '-' || :days || ' days')
        GROUP BY week, muscle_group
        ORDER BY week, muscle_group
    """)
    suspend fun getWeeklyVolume(userId: Long, days: Int): List<WeeklyVolumeRow>

    @Query("""
        SELECT date(s.started_at, '+1 day', 'weekday 1', '-7 days') AS week,
               COUNT(*) AS session_count
        FROM sessions s
        WHERE s.user_id = :userId AND s.status = 'completed'
          AND s.started_at >= date('now', '-' || :days || ' days')
        GROUP BY week
        ORDER BY week
    """)
    suspend fun getWeeklyFrequency(userId: Long, days: Int): List<WeeklyFrequencyRow>

    @Query("""
        SELECT e.id, e.name, e.muscle_group,
               COUNT(DISTINCT s.id) AS session_count
        FROM exercises e
        JOIN session_exercises se ON se.exercise_id = e.id
        JOIN sessions s ON s.id = se.session_id
        JOIN sets st ON st.session_exercise_id = se.id
        WHERE s.user_id = :userId AND s.status = 'completed'
          AND st.set_type = 'working'
          AND st.weight_kg > 0 AND st.reps > 0
        GROUP BY e.id
        ORDER BY session_count DESC
    """)
    suspend fun getExercisesWithSessionCount(userId: Long): List<ExerciseWithSessionCountRow>

    @Query("""
        SELECT se.exercise_id, e.name AS exercise_name,
               e.muscle_group,
               st.set_number, st.weight_kg, st.reps, st.rir,
               date(s.started_at) AS date
        FROM sets st
        JOIN session_exercises se ON se.id = st.session_exercise_id
        JOIN sessions s ON s.id = se.session_id
        JOIN exercises e ON e.id = se.exercise_id
        WHERE s.user_id = :userId AND s.status = 'completed'
          AND st.set_type = 'working'
          AND st.weight_kg > 0 AND st.reps > 0
        ORDER BY s.started_at, st.set_number
    """)
    suspend fun getAllWorkingSets(userId: Long): List<AllExerciseSetRow>

    @Query("""
        WITH top_exercises AS (
            SELECT e.id, e.name, e.short_name, COALESCE(e.muscle_group, 'Other') AS muscle_group,
                   COUNT(DISTINCT s.id) AS session_count
            FROM exercises e
            JOIN session_exercises se ON se.exercise_id = e.id
            JOIN sessions s ON s.id = se.session_id
            JOIN sets st ON st.session_exercise_id = se.id
            WHERE s.user_id = :userId AND s.status = 'completed'
              AND st.set_type = 'working' AND st.weight_kg > 0 AND st.reps > 0
            GROUP BY e.id
            ORDER BY session_count DESC
            LIMIT 15
        ),
        best_e1rm AS (
            SELECT te.id AS exercise_id, te.name AS exercise_name,
                   te.short_name, te.muscle_group, te.session_count,
                   CASE
                       WHEN date(s.started_at) >= date('now', '-28 days') THEN 'recent'
                       WHEN date(s.started_at) >= date('now', '-56 days') THEN 'previous'
                   END AS period,
                   MAX(st.weight_kg * (1.0 + CAST(st.reps AS REAL) / 30.0)) AS best_e1rm
            FROM top_exercises te
            JOIN session_exercises se ON se.exercise_id = te.id
            JOIN sessions s ON s.id = se.session_id
            JOIN sets st ON st.session_exercise_id = se.id
            WHERE s.user_id = :userId AND s.status = 'completed'
              AND st.set_type = 'working' AND st.weight_kg > 0 AND st.reps > 0
              AND date(s.started_at) >= date('now', '-56 days')
            GROUP BY te.id, period
        )
        SELECT exercise_id, exercise_name, short_name, muscle_group, session_count, period, best_e1rm
        FROM best_e1rm
        WHERE period IS NOT NULL
        ORDER BY session_count DESC, exercise_id, period
    """)
    suspend fun getStrengthTrend(userId: Long): List<StrengthTrendRow>
}

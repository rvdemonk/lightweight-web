package xyz.rigby3.lightweight.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow
import xyz.rigby3.lightweight.data.local.entity.TemplateEntity
import xyz.rigby3.lightweight.data.local.entity.TemplateExerciseEntity
import xyz.rigby3.lightweight.data.local.entity.TemplateSnapshotEntity

@Dao
interface TemplateDao {

    @Query("SELECT * FROM templates WHERE user_id = :userId AND archived = 0 ORDER BY name")
    fun getAll(userId: Long): Flow<List<TemplateEntity>>

    @Query("SELECT * FROM templates WHERE id = :id")
    suspend fun getById(id: Long): TemplateEntity?

    @Query("SELECT * FROM template_exercises WHERE template_id = :templateId ORDER BY position")
    suspend fun getExercises(templateId: Long): List<TemplateExerciseEntity>

    @Query("""
        SELECT te.id, te.exercise_id, e.name as exercise_name, te.position,
               te.target_sets, te.target_reps_min, te.target_reps_max, te.rest_seconds, te.notes
        FROM template_exercises te
        JOIN exercises e ON e.id = te.exercise_id
        WHERE te.template_id = :templateId
        ORDER BY te.position
    """)
    suspend fun getExercisesWithNames(templateId: Long): List<xyz.rigby3.lightweight.data.local.row.TemplateExerciseRow>

    @Insert
    suspend fun insert(template: TemplateEntity): Long

    @Update
    suspend fun update(template: TemplateEntity)

    @Insert
    suspend fun insertExercise(exercise: TemplateExerciseEntity): Long

    @Query("DELETE FROM template_exercises WHERE template_id = :templateId")
    suspend fun deleteExercises(templateId: Long)

    @Insert
    suspend fun insertSnapshot(snapshot: TemplateSnapshotEntity): Long

    @Query("UPDATE templates SET archived = 1 WHERE id = :id")
    suspend fun archive(id: Long)
}

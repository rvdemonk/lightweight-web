package xyz.rigby3.lightweight.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow
import xyz.rigby3.lightweight.data.local.entity.TemplateEntity
import xyz.rigby3.lightweight.data.local.entity.TemplateExerciseEntity

@Dao
interface TemplateDao {

    @Query("SELECT * FROM templates WHERE user_id = :userId AND archived = 0 ORDER BY name")
    fun getAll(userId: Long): Flow<List<TemplateEntity>>

    @Query("SELECT * FROM templates WHERE id = :id")
    suspend fun getById(id: Long): TemplateEntity?

    @Query("SELECT * FROM template_exercises WHERE template_id = :templateId ORDER BY position")
    suspend fun getExercises(templateId: Long): List<TemplateExerciseEntity>

    @Insert
    suspend fun insert(template: TemplateEntity): Long

    @Update
    suspend fun update(template: TemplateEntity)

    @Insert
    suspend fun insertExercise(exercise: TemplateExerciseEntity): Long

    @Query("DELETE FROM template_exercises WHERE template_id = :templateId")
    suspend fun deleteExercises(templateId: Long)
}

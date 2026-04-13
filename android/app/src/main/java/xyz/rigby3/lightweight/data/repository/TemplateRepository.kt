package xyz.rigby3.lightweight.data.repository

import kotlinx.coroutines.flow.Flow
import org.json.JSONArray
import org.json.JSONObject
import xyz.rigby3.lightweight.data.local.TokenStore
import xyz.rigby3.lightweight.data.local.dao.TemplateDao
import xyz.rigby3.lightweight.data.local.entity.TemplateEntity
import xyz.rigby3.lightweight.data.local.entity.TemplateExerciseEntity
import xyz.rigby3.lightweight.data.local.entity.TemplateSnapshotEntity
import xyz.rigby3.lightweight.data.local.row.TemplateExerciseRow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TemplateRepository @Inject constructor(
    private val templateDao: TemplateDao
) {
    private val userId = TokenStore.LOCAL_USER_ID

    fun getAll(): Flow<List<TemplateEntity>> =
        templateDao.getAll(userId)

    suspend fun getById(id: Long): TemplateEntity? =
        templateDao.getById(id)

    suspend fun getExercises(templateId: Long): List<TemplateExerciseEntity> =
        templateDao.getExercises(templateId)

    suspend fun getExercisesWithNames(templateId: Long): List<TemplateExerciseRow> =
        templateDao.getExercisesWithNames(templateId)

    suspend fun save(template: TemplateEntity): Long =
        templateDao.insert(template)

    suspend fun update(template: TemplateEntity) =
        templateDao.update(template)

    suspend fun setExercises(templateId: Long, exercises: List<TemplateExerciseEntity>) {
        templateDao.deleteExercises(templateId)
        exercises.forEach { templateDao.insertExercise(it) }
    }

    suspend fun archive(id: Long) =
        templateDao.archive(id)

    suspend fun saveWithVersioning(
        templateId: Long,
        name: String,
        notes: String?,
        exercises: List<EditableTemplateExercise>,
    ) {
        val existing = templateDao.getById(templateId) ?: return
        val oldExercises = templateDao.getExercises(templateId)

        // Snapshot current state
        val snapshotJson = serializeExercises(oldExercises)
        templateDao.insertSnapshot(
            TemplateSnapshotEntity(
                templateId = templateId,
                version = existing.version,
                snapshotJson = snapshotJson,
                createdAt = java.time.Instant.now().toString(),
            )
        )

        // Update template
        templateDao.update(
            existing.copy(
                name = name,
                notes = notes,
                version = existing.version + 1,
                updatedAt = java.time.Instant.now().toString(),
            )
        )

        // Replace exercises
        templateDao.deleteExercises(templateId)
        exercises.forEachIndexed { i, ex ->
            templateDao.insertExercise(
                TemplateExerciseEntity(
                    templateId = templateId,
                    exerciseId = ex.exerciseId,
                    position = i + 1,
                    targetSets = ex.targetSets,
                    targetRepsMin = ex.targetRepsMin,
                    targetRepsMax = ex.targetRepsMax,
                )
            )
        }
    }

    suspend fun createNew(
        name: String,
        notes: String?,
        exercises: List<EditableTemplateExercise>,
    ): Long {
        val now = java.time.Instant.now().toString()
        val templateId = templateDao.insert(
            TemplateEntity(
                userId = userId,
                name = name,
                notes = notes,
                createdAt = now,
                updatedAt = now,
                version = 1,
            )
        )
        exercises.forEachIndexed { i, ex ->
            templateDao.insertExercise(
                TemplateExerciseEntity(
                    templateId = templateId,
                    exerciseId = ex.exerciseId,
                    position = i + 1,
                    targetSets = ex.targetSets,
                    targetRepsMin = ex.targetRepsMin,
                    targetRepsMax = ex.targetRepsMax,
                )
            )
        }
        return templateId
    }

    private fun serializeExercises(exercises: List<TemplateExerciseEntity>): String {
        val arr = JSONArray()
        exercises.forEach { ex ->
            val obj = JSONObject()
            obj.put("exerciseId", ex.exerciseId)
            obj.put("position", ex.position)
            obj.put("targetSets", ex.targetSets ?: JSONObject.NULL)
            obj.put("targetRepsMin", ex.targetRepsMin ?: JSONObject.NULL)
            obj.put("targetRepsMax", ex.targetRepsMax ?: JSONObject.NULL)
            obj.put("restSeconds", ex.restSeconds ?: JSONObject.NULL)
            obj.put("notes", ex.notes ?: JSONObject.NULL)
            arr.put(obj)
        }
        return arr.toString()
    }
}

data class EditableTemplateExercise(
    val exerciseId: Long,
    val exerciseName: String,
    val targetSets: Int = 3,
    val targetRepsMin: Int = 8,
    val targetRepsMax: Int = 12,
)

package xyz.rigby3.lightweight.data.repository

import kotlinx.coroutines.flow.Flow
import xyz.rigby3.lightweight.data.local.dao.TemplateDao
import xyz.rigby3.lightweight.data.local.entity.TemplateEntity
import xyz.rigby3.lightweight.data.local.entity.TemplateExerciseEntity
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TemplateRepository @Inject constructor(
    private val templateDao: TemplateDao
) {
    fun getAll(userId: Long): Flow<List<TemplateEntity>> =
        templateDao.getAll(userId)

    suspend fun getById(id: Long): TemplateEntity? =
        templateDao.getById(id)

    suspend fun getExercises(templateId: Long): List<TemplateExerciseEntity> =
        templateDao.getExercises(templateId)

    suspend fun save(template: TemplateEntity): Long =
        templateDao.insert(template)

    suspend fun update(template: TemplateEntity) =
        templateDao.update(template)

    suspend fun setExercises(templateId: Long, exercises: List<TemplateExerciseEntity>) {
        templateDao.deleteExercises(templateId)
        exercises.forEach { templateDao.insertExercise(it) }
    }
}

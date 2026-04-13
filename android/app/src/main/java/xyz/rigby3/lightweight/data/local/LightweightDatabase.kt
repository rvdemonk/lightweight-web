package xyz.rigby3.lightweight.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import xyz.rigby3.lightweight.data.local.dao.ExerciseDao
import xyz.rigby3.lightweight.data.local.dao.SessionDao
import xyz.rigby3.lightweight.data.local.dao.SetDao
import xyz.rigby3.lightweight.data.local.dao.TemplateDao
import xyz.rigby3.lightweight.data.local.entity.ExerciseEntity
import xyz.rigby3.lightweight.data.local.entity.SessionEntity
import xyz.rigby3.lightweight.data.local.entity.SessionExerciseEntity
import xyz.rigby3.lightweight.data.local.entity.SetEntity
import xyz.rigby3.lightweight.data.local.entity.TemplateEntity
import xyz.rigby3.lightweight.data.local.entity.TemplateExerciseEntity
import xyz.rigby3.lightweight.data.local.entity.TemplateSnapshotEntity
import xyz.rigby3.lightweight.data.local.entity.UserPreferenceEntity

@Database(
    entities = [
        ExerciseEntity::class,
        TemplateEntity::class,
        TemplateExerciseEntity::class,
        SessionEntity::class,
        SessionExerciseEntity::class,
        SetEntity::class,
        TemplateSnapshotEntity::class,
        UserPreferenceEntity::class
    ],
    version = 1,
    exportSchema = true
)
abstract class LightweightDatabase : RoomDatabase() {
    abstract fun exerciseDao(): ExerciseDao
    abstract fun templateDao(): TemplateDao
    abstract fun sessionDao(): SessionDao
    abstract fun setDao(): SetDao
}

package xyz.rigby3.lightweight.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import xyz.rigby3.lightweight.data.local.dao.AnalyticsDao
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
    version = 3,
    exportSchema = true
)
abstract class LightweightDatabase : RoomDatabase() {

    companion object {
        val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE exercises ADD COLUMN short_name TEXT DEFAULT NULL")
            }
        }

        val MIGRATION_2_3 = object : Migration(2, 3) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE sessions ADD COLUMN synced INTEGER NOT NULL DEFAULT 0")
            }
        }
    }

    abstract fun exerciseDao(): ExerciseDao
    abstract fun templateDao(): TemplateDao
    abstract fun sessionDao(): SessionDao
    abstract fun setDao(): SetDao
    abstract fun analyticsDao(): AnalyticsDao
}

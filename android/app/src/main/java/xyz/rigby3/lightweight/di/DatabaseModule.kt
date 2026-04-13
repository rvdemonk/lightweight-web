package xyz.rigby3.lightweight.di

import android.content.Context
import androidx.room.Room
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import xyz.rigby3.lightweight.data.local.LightweightDatabase
import xyz.rigby3.lightweight.data.local.dao.AnalyticsDao
import xyz.rigby3.lightweight.data.local.dao.ExerciseDao
import xyz.rigby3.lightweight.data.local.dao.SessionDao
import xyz.rigby3.lightweight.data.local.dao.SetDao
import xyz.rigby3.lightweight.data.local.dao.TemplateDao
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): LightweightDatabase {
        return Room.databaseBuilder(
            context.applicationContext,
            LightweightDatabase::class.java,
            "lightweight.db"
        ).build()
    }

    @Provides
    fun provideExerciseDao(database: LightweightDatabase): ExerciseDao =
        database.exerciseDao()

    @Provides
    fun provideTemplateDao(database: LightweightDatabase): TemplateDao =
        database.templateDao()

    @Provides
    fun provideSessionDao(database: LightweightDatabase): SessionDao =
        database.sessionDao()

    @Provides
    fun provideSetDao(database: LightweightDatabase): SetDao =
        database.setDao()

    @Provides
    fun provideAnalyticsDao(database: LightweightDatabase): AnalyticsDao =
        database.analyticsDao()
}

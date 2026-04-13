package xyz.rigby3.lightweight.ui.navigation

import kotlinx.serialization.Serializable

// Bottom bar destinations
@Serializable object HomeRoute
@Serializable object ExercisesRoute
@Serializable object HistoryRoute
@Serializable object AnalyticsRoute

// Other destinations
@Serializable object LoginRoute
@Serializable object SettingsRoute
@Serializable object WorkoutRoute
@Serializable data class SessionRoute(val id: Long)
@Serializable object TemplatesRoute
@Serializable data class TemplateDetailRoute(val id: Long)
@Serializable object NewTemplateRoute
@Serializable data class JoinRoute(val code: String)

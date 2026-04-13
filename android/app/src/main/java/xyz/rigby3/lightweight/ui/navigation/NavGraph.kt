package xyz.rigby3.lightweight.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.toRoute
import xyz.rigby3.lightweight.ui.screens.analytics.AnalyticsScreen
import xyz.rigby3.lightweight.ui.screens.exercises.ExercisesScreen
import xyz.rigby3.lightweight.ui.screens.history.HistoryScreen
import xyz.rigby3.lightweight.ui.screens.home.HomeScreen
import xyz.rigby3.lightweight.ui.screens.login.LoginScreen
import xyz.rigby3.lightweight.ui.screens.session.SessionScreen
import xyz.rigby3.lightweight.ui.screens.settings.SettingsScreen
import xyz.rigby3.lightweight.ui.screens.templates.TemplateDetailScreen
import xyz.rigby3.lightweight.ui.screens.templates.TemplatesScreen
import xyz.rigby3.lightweight.ui.screens.workout.WorkoutScreen

@Composable
fun LightweightNavGraph(
    navController: NavHostController,
    modifier: Modifier = Modifier,
) {
    NavHost(
        navController = navController,
        startDestination = HomeRoute,
        modifier = modifier,
    ) {
        composable<HomeRoute> {
            HomeScreen(
                onNavigateToWorkout = { navController.navigate(WorkoutRoute) },
                onNavigateToTemplates = { navController.navigate(TemplatesRoute) },
            )
        }

        composable<ExercisesRoute> {
            ExercisesScreen()
        }

        composable<HistoryRoute> {
            HistoryScreen(
                onNavigateToSession = { id -> navController.navigate(SessionRoute(id)) },
                onNavigateToWorkout = { navController.navigate(WorkoutRoute) },
            )
        }

        composable<AnalyticsRoute> {
            AnalyticsScreen()
        }

        composable<LoginRoute> {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate(HomeRoute) {
                        popUpTo(LoginRoute) { inclusive = true }
                    }
                },
            )
        }

        composable<SettingsRoute> {
            SettingsScreen(
                onLogout = {
                    navController.navigate(LoginRoute) {
                        popUpTo(0) { inclusive = true }
                    }
                },
                onNavigateToInvites = { /* TODO: wire invite management */ },
            )
        }

        composable<WorkoutRoute> {
            WorkoutScreen(
                onNavigateBack = { navController.popBackStack() },
            )
        }

        composable<SessionRoute> { backStackEntry ->
            val route: SessionRoute = backStackEntry.toRoute()
            SessionScreen(
                sessionId = route.id,
                onNavigateBack = { navController.popBackStack() },
            )
        }

        composable<TemplatesRoute> {
            TemplatesScreen(
                onNavigateToTemplate = { id ->
                    navController.navigate(TemplateDetailRoute(id))
                },
            )
        }

        composable<TemplateDetailRoute> { backStackEntry ->
            val route: TemplateDetailRoute = backStackEntry.toRoute()
            TemplateDetailScreen(
                templateId = route.id,
                onNavigateBack = { navController.popBackStack() },
            )
        }

        composable<JoinRoute> { backStackEntry ->
            val route: JoinRoute = backStackEntry.toRoute()
            // JoinRoute will be built out later; for now navigate to login
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate(HomeRoute) {
                        popUpTo(JoinRoute(route.code)) { inclusive = true }
                    }
                },
            )
        }
    }
}

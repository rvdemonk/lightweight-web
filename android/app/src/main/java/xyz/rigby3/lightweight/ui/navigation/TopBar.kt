package xyz.rigby3.lightweight.ui.navigation

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.currentBackStackEntryAsState
import xyz.rigby3.lightweight.ui.theme.LightweightTheme

private fun titleForRoute(route: String?): String = when {
    route == null -> ""
    "HomeRoute" in route -> "LIGHTWEIGHT"
    "TemplatesRoute" in route -> "TEMPLATES"
    "HistoryRoute" in route -> "HISTORY"
    "AnalyticsRoute" in route -> "ANALYTICS"
    "SettingsRoute" in route -> "SETTINGS"
    "WorkoutRoute" in route -> "WORKOUT"
    "SessionRoute" in route -> "HISTORY"
    "ExercisesRoute" in route -> "EXERCISES"
    "NewTemplateRoute" in route -> "NEW TEMPLATE"
    "TemplateDetailRoute" in route -> "EDIT TEMPLATE"
    "LoginRoute" in route -> "LOGIN"
    else -> ""
}

private fun showBackButton(route: String?): Boolean = when {
    route == null -> false
    "SessionRoute" in route -> true
    "TemplateDetailRoute" in route -> true
    "NewTemplateRoute" in route -> true
    "SettingsRoute" in route -> true
    else -> false
}

private fun showSettingsIcon(route: String?): Boolean = when {
    route == null -> false
    "LoginRoute" in route -> false
    "JoinRoute" in route -> false
    "SettingsRoute" in route -> false
    "TemplateDetailRoute" in route -> false
    "NewTemplateRoute" in route -> false
    "SessionRoute" in route -> false
    else -> true
}

@Composable
fun LightweightTopBar(navController: NavController) {
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route
    val title = titleForRoute(currentRoute)
    val hasBack = showBackButton(currentRoute)
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .height(56.dp)
            .padding(horizontal = 16.dp),
    ) {
        // Centered title
        Text(
            text = title,
            style = typography.pageTitle,
            color = colors.textPrimary,
            modifier = Modifier.align(Alignment.Center),
        )

        // Back button (left)
        if (hasBack) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = "Back",
                tint = colors.textSecondary,
                modifier = Modifier
                    .size(28.dp)
                    .align(Alignment.CenterStart)
                    .clickable { navController.popBackStack() },
            )
        }

        // Settings icon (right)
        if (showSettingsIcon(currentRoute)) {
            IconButton(
                onClick = {
                    navController.navigate(SettingsRoute) {
                        launchSingleTop = true
                    }
                },
                modifier = Modifier
                    .size(44.dp)
                    .align(Alignment.CenterEnd),
            ) {
                Icon(
                    imageVector = Icons.Outlined.Settings,
                    contentDescription = "Settings",
                    tint = colors.textSecondary,
                )
            }
        }
    }
}

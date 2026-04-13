package xyz.rigby3.lightweight.ui.navigation

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material.icons.Icons
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
import androidx.navigation.compose.currentBackStackEntryAsState
import xyz.rigby3.lightweight.ui.theme.LightweightTheme

private fun titleForRoute(route: String?): String = when {
    route == null -> ""
    route.endsWith("HomeRoute") -> "LIGHTWEIGHT"
    route.endsWith("TemplatesRoute") -> "TEMPLATES"
    route.endsWith("HistoryRoute") -> "HISTORY"
    route.endsWith("AnalyticsRoute") -> "ANALYTICS"
    route.endsWith("SettingsRoute") -> "SETTINGS"
    route.endsWith("WorkoutRoute") -> "WORKOUT"
    route.endsWith("SessionRoute") -> "SESSION"
    route.endsWith("ExercisesRoute") -> "EXERCISES"
    route.endsWith("TemplateDetailRoute") -> "TEMPLATE"
    route.endsWith("LoginRoute") -> "LOGIN"
    else -> ""
}

private fun showSettingsIcon(route: String?): Boolean = when {
    route == null -> false
    route.endsWith("LoginRoute") -> false
    route.endsWith("JoinRoute") -> false
    route.endsWith("SettingsRoute") -> false
    else -> true
}

@Composable
fun LightweightTopBar(navController: NavController) {
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route
    val title = titleForRoute(currentRoute)
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = title,
            style = typography.pageTitle,
            color = colors.textPrimary,
        )
        Spacer(Modifier.weight(1f))
        if (showSettingsIcon(currentRoute)) {
            IconButton(
                onClick = { navController.navigate(SettingsRoute) },
                modifier = Modifier.size(44.dp),
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

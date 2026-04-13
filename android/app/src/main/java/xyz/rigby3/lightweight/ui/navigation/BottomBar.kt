package xyz.rigby3.lightweight.ui.navigation

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.ViewList
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.ViewList
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.currentBackStackEntryAsState
import xyz.rigby3.lightweight.ui.theme.CardRadius
import xyz.rigby3.lightweight.ui.theme.LightweightTheme

private data class BottomBarTab(
    val route: Any,
    val iconActive: ImageVector,
    val iconInactive: ImageVector,
    val label: String,
)

private val tabs = listOf(
    BottomBarTab(route = HomeRoute, iconActive = Icons.Filled.Home, iconInactive = Icons.Outlined.Home, label = "HOME"),
    BottomBarTab(route = TemplatesRoute, iconActive = Icons.Filled.ViewList, iconInactive = Icons.Outlined.ViewList, label = "TEMPLATES"),
    BottomBarTab(route = HistoryRoute, iconActive = Icons.Filled.History, iconInactive = Icons.Outlined.History, label = "HISTORY"),
    BottomBarTab(route = AnalyticsRoute, iconActive = Icons.Filled.BarChart, iconInactive = Icons.Outlined.BarChart, label = "ANALYTICS"),
)

@Composable
fun LightweightBottomBar(navController: NavController) {
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination
    val colors = LightweightTheme.colors
    val indicatorShape = RoundedCornerShape(CardRadius)

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(colors.bgSurface)
            .navigationBarsPadding()
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        tabs.forEach { tab ->
            val selected = currentDestination?.route == tab.route::class.qualifiedName

            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                    ) {
                        navController.navigate(tab.route) {
                            popUpTo(navController.graph.findStartDestination().id) {
                                saveState = true
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                    },
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = if (selected) tab.iconActive else tab.iconInactive,
                    contentDescription = tab.label,
                    tint = if (selected) colors.accentPrimary else colors.textSecondary,
                    modifier = Modifier.size(28.dp),
                )
            }
        }
    }
}

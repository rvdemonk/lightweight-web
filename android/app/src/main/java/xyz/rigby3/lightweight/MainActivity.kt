package xyz.rigby3.lightweight

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat
import androidx.lifecycle.lifecycleScope
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import xyz.rigby3.lightweight.data.local.TokenStore
import xyz.rigby3.lightweight.data.repository.ExerciseRepository
import xyz.rigby3.lightweight.data.repository.SessionRepository
import xyz.rigby3.lightweight.ui.navigation.LightweightBottomBar
import xyz.rigby3.lightweight.ui.navigation.LightweightNavGraph
import xyz.rigby3.lightweight.ui.navigation.LightweightTopBar
import xyz.rigby3.lightweight.ui.navigation.WorkoutRoute
import xyz.rigby3.lightweight.ui.theme.LightweightTheme
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject lateinit var tokenStore: TokenStore
    @Inject lateinit var exerciseRepository: ExerciseRepository
    @Inject lateinit var sessionRepository: SessionRepository

    private var isDark by mutableStateOf(true)
    private var hasActiveWorkout by mutableStateOf(false)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        isDark = tokenStore.isDarkTheme

        lifecycleScope.launch { exerciseRepository.seedIfEmpty() }

        setContent {
            LightweightTheme(darkTheme = isDark) {
                // Dynamic status bar icon color based on theme
                val view = LocalView.current
                if (!view.isInEditMode) {
                    SideEffect {
                        WindowCompat.getInsetsController(window, view).apply {
                            isAppearanceLightStatusBars = !isDark
                            isAppearanceLightNavigationBars = !isDark
                        }
                    }
                }
                val navController = rememberNavController()

                // Re-check active workout on every nav change
                val navEntry by navController.currentBackStackEntryAsState()
                LaunchedEffect(navEntry?.id) {
                    hasActiveWorkout = sessionRepository.getActive() != null
                }

                // On first launch, navigate to active workout if one exists
                LaunchedEffect(Unit) {
                    if (tokenStore.isLoggedIn) {
                        val active = sessionRepository.getActive()
                        if (active != null) {
                            navController.navigate(WorkoutRoute) {
                                launchSingleTop = true
                            }
                        }
                    }
                }

                Scaffold(
                    containerColor = LightweightTheme.colors.bgPrimary,
                    topBar = { LightweightTopBar(navController = navController) },
                    bottomBar = {
                        LightweightBottomBar(
                            navController = navController,
                            hasActiveWorkout = hasActiveWorkout,
                        )
                    },
                ) { contentPadding ->
                    LightweightNavGraph(
                        navController = navController,
                        modifier = Modifier.padding(contentPadding),
                        isLoggedIn = tokenStore.isLoggedIn,
                        onThemeToggled = { isDark = tokenStore.isDarkTheme },
                    )
                }
            }
        }
    }

}

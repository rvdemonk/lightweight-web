package xyz.rigby3.lightweight

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import dagger.hilt.android.AndroidEntryPoint
import xyz.rigby3.lightweight.data.local.TokenStore
import xyz.rigby3.lightweight.data.repository.SessionRepository
import xyz.rigby3.lightweight.ui.navigation.LightweightBottomBar
import xyz.rigby3.lightweight.ui.navigation.LightweightNavGraph
import xyz.rigby3.lightweight.ui.navigation.LightweightTopBar
import xyz.rigby3.lightweight.ui.navigation.LoginRoute
import xyz.rigby3.lightweight.ui.navigation.RegisterRoute
import xyz.rigby3.lightweight.ui.navigation.WorkoutRoute
import xyz.rigby3.lightweight.ui.theme.LightweightTheme
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject lateinit var tokenStore: TokenStore
    @Inject lateinit var sessionRepository: SessionRepository

    private val viewModel: MainActivityViewModel by viewModels()
    private var hasActiveWorkout by mutableStateOf(false)

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen().setKeepOnScreenCondition {
            viewModel.uiState.value is MainActivityUiState.Loading
        }
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            val uiState by viewModel.uiState.collectAsStateWithLifecycle()

            if (uiState is MainActivityUiState.Loading) return@setContent

            val readyState = uiState as MainActivityUiState.Ready
            var isDark by remember { mutableStateOf(readyState.isDarkTheme) }

            LightweightTheme(darkTheme = isDark) {
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

                // Re-check active workout on every nav change (for bottom bar)
                val navEntry by navController.currentBackStackEntryAsState()
                LaunchedEffect(navEntry?.id) {
                    hasActiveWorkout = sessionRepository.getActive() != null
                }

                // Navigate to active workout on first launch
                LaunchedEffect(readyState.activeSessionId) {
                    if (readyState.activeSessionId != null) {
                        navController.navigate(WorkoutRoute) {
                            launchSingleTop = true
                        }
                    }
                }

                val currentRoute = navEntry?.destination?.route ?: ""
                val isAuthScreen = "LoginRoute" in currentRoute
                        || "RegisterRoute" in currentRoute
                        || "JoinRoute" in currentRoute

                Scaffold(
                    containerColor = LightweightTheme.colors.bgPrimary,
                    topBar = {
                        if (!isAuthScreen) LightweightTopBar(navController = navController)
                    },
                    bottomBar = {
                        if (!isAuthScreen) {
                            LightweightBottomBar(
                                navController = navController,
                                hasActiveWorkout = hasActiveWorkout,
                            )
                        }
                    },
                ) { contentPadding ->
                    LightweightNavGraph(
                        navController = navController,
                        modifier = Modifier.padding(contentPadding),
                        isLoggedIn = readyState.isLoggedIn,
                        onThemeToggled = { isDark = tokenStore.isDarkTheme },
                    )
                }
            }
        }
    }
}

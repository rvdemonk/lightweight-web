package xyz.rigby3.lightweight

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.ui.Modifier
import androidx.navigation.compose.rememberNavController
import dagger.hilt.android.AndroidEntryPoint
import androidx.compose.foundation.layout.Column
import xyz.rigby3.lightweight.ui.navigation.LightweightBottomBar
import xyz.rigby3.lightweight.ui.navigation.LightweightNavGraph
import xyz.rigby3.lightweight.ui.navigation.LightweightTopBar
import xyz.rigby3.lightweight.ui.theme.LightweightTheme

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            LightweightTheme {
                val navController = rememberNavController()
                Scaffold(
                    containerColor = LightweightTheme.colors.bgPrimary,
                    topBar = { LightweightTopBar(navController = navController) },
                    bottomBar = { LightweightBottomBar(navController = navController) },
                ) { contentPadding ->
                    LightweightNavGraph(
                        navController = navController,
                        modifier = Modifier.padding(contentPadding),
                    )
                }
            }
        }
    }
}

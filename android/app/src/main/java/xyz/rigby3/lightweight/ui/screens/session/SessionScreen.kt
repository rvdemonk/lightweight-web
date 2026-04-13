package xyz.rigby3.lightweight.ui.screens.session

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import xyz.rigby3.lightweight.ui.theme.LightweightTheme

@Composable
fun SessionScreen(
    sessionId: Long,
    onNavigateBack: () -> Unit = {},
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(LightweightTheme.colors.bgPrimary)
            .padding(16.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = "SESSION",
            style = LightweightTheme.typography.pageTitle,
            color = LightweightTheme.colors.textPrimary,
        )
        Text(
            text = "Session #$sessionId",
            style = LightweightTheme.typography.body,
            color = LightweightTheme.colors.textSecondary,
            modifier = Modifier.padding(top = 8.dp),
        )
    }
}

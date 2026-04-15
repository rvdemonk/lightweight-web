package xyz.rigby3.lightweight.ui.screens.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import kotlinx.coroutines.delay
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import xyz.rigby3.lightweight.ui.components.LwButton
import xyz.rigby3.lightweight.ui.components.LwButtonStyle
import xyz.rigby3.lightweight.ui.components.LwCard
import xyz.rigby3.lightweight.ui.theme.LightweightTheme
import xyz.rigby3.lightweight.ui.theme.MinTouchTarget
import xyz.rigby3.lightweight.ui.theme.PagePadding
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

private fun formatJoinDate(iso: String): String {
    return try {
        val date = LocalDate.parse(iso.substringBefore("T").substringBefore(" "))
        date.format(DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH)).uppercase()
    } catch (_: Exception) {
        iso
    }
}

@Composable
fun SettingsScreen(
    onLogout: () -> Unit = {},
    onThemeToggled: () -> Unit = {},
    viewModel: SettingsViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.events.collect { event ->
            when (event) {
                SettingsEvent.LoggedOut -> onLogout()
            }
        }
    }

    if (state.showSyncPreview) {
        xyz.rigby3.lightweight.ui.screens.login.SyncScreen()
        // Tap anywhere to dismiss
        Box(
            modifier = Modifier
                .fillMaxSize()
                .clickable(
                    indication = null,
                    interactionSource = remember { MutableInteractionSource() },
                    onClick = { viewModel.toggleSyncPreview() },
                ),
        )
        return
    }

    SettingsContent(
        state = state,
        onToggleTheme = { viewModel.toggleTheme(); onThemeToggled() },
        onSync = viewModel::sync,
        onToggleAutoSync = viewModel::toggleAutoSync,
        onToggleSyncPreview = viewModel::toggleSyncPreview,
        onLogout = viewModel::logout,
    )
}

@Composable
private fun SettingsContent(
    state: SettingsState,
    onToggleTheme: () -> Unit,
    onSync: () -> Unit,
    onToggleAutoSync: () -> Unit,
    onToggleSyncPreview: () -> Unit,
    onLogout: () -> Unit,
) {
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.bgPrimary)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = PagePadding),
    ) {
        // --- ACCOUNT section (top) ---
        SectionHeader(text = "ACCOUNT")

        LwCard {
            Column {
                val accountName = state.username
                    ?: state.displayName
                    ?: state.email
                    ?: "UNKNOWN"
                Text(
                    text = accountName.uppercase(),
                    style = typography.cardTitle,
                    color = colors.accentPrimary,
                )
                val secondaryLine = when {
                    state.username != null && state.email != null -> state.email
                    state.username == null && state.email != null -> "GOOGLE ACCOUNT"
                    else -> null
                }
                if (secondaryLine != null) {
                    Text(
                        text = secondaryLine,
                        style = typography.label,
                        color = colors.textSecondary,
                        modifier = Modifier.padding(top = 2.dp),
                    )
                }
                if (state.joinedAt != null) {
                    Text(
                        text = "JOINED ${formatJoinDate(state.joinedAt)}",
                        style = typography.label.copy(fontSize = 11.sp),
                        color = colors.textSecondary,
                        modifier = Modifier.padding(top = 6.dp),
                    )
                }
            }
        }

        // --- INVITE section ---
        SectionHeader(text = "INVITE A FRIEND")

        run {
            val clipboardManager = LocalClipboardManager.current
            var inviteCopied by remember { mutableStateOf(false) }
            val ref = state.username ?: state.email ?: state.userId?.toString() ?: ""
            val betaUrl = "https://lightweight.3rigby.xyz/beta${if (ref.isNotEmpty()) "?ref=$ref" else ""}"

            if (inviteCopied) {
                LaunchedEffect(Unit) {
                    delay(2000)
                    inviteCopied = false
                }
            }

            LwCard(onClick = {
                clipboardManager.setText(AnnotatedString(betaUrl))
                inviteCopied = true
            }) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "INVITE A FRIEND",
                            style = typography.body.copy(fontWeight = androidx.compose.ui.text.font.FontWeight.SemiBold),
                            color = colors.accentCyan,
                        )
                        Text(
                            text = if (inviteCopied) "Link copied!" else "Copy invite link to share",
                            style = typography.body,
                            color = if (inviteCopied) colors.accentGreen else colors.textSecondary,
                            modifier = Modifier.padding(top = 4.dp),
                        )
                    }
                    if (inviteCopied) {
                        Text(
                            text = "✓",
                            fontFamily = typography.data.fontFamily,
                            fontSize = 24.sp,
                            color = colors.accentGreen,
                        )
                    }
                }
            }
        }

        // --- APPEARANCE section ---
        SectionHeader(text = "APPEARANCE")

        LwCard {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "NIGHT MODE",
                    style = typography.body.copy(fontWeight = androidx.compose.ui.text.font.FontWeight.SemiBold),
                    color = colors.textPrimary,
                )
                NightModeToggle(
                    enabled = state.isDarkTheme,
                    onToggle = onToggleTheme,
                )
            }
        }

        // --- DATA section ---
        SectionHeader(text = "DATA")

        LwCard(onClick = if (state.importStatus !is ImportStatus.InProgress) onSync else null) {
            Column(modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = "SYNC",
                    style = typography.body.copy(fontWeight = androidx.compose.ui.text.font.FontWeight.SemiBold),
                    color = colors.textPrimary,
                )
                Text(
                    text = when (val status = state.importStatus) {
                        is ImportStatus.Idle -> "Back up workouts to server"
                        is ImportStatus.InProgress -> if (status.total > 0) {
                            "${status.phase} (${status.current}/${status.total})"
                        } else {
                            status.phase
                        }
                        is ImportStatus.Success -> status.message
                        is ImportStatus.Error -> status.message
                    },
                    style = typography.body,
                    color = when (state.importStatus) {
                        is ImportStatus.Success -> colors.accentGreen
                        is ImportStatus.Error -> colors.accentRed
                        is ImportStatus.InProgress -> colors.accentCyan
                        else -> colors.textSecondary
                    },
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
        }

        LwCard {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "AUTO-SYNC",
                        style = typography.body.copy(fontWeight = androidx.compose.ui.text.font.FontWeight.SemiBold),
                        color = colors.textPrimary,
                    )
                    Text(
                        text = "Back up after each workout",
                        style = typography.body,
                        color = colors.textSecondary,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
                NightModeToggle(
                    enabled = state.autoSyncEnabled,
                    onToggle = onToggleAutoSync,
                )
            }
        }

        LwCard {
            Column(modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = "EXPORT SESSIONS",
                    style = typography.body.copy(fontWeight = androidx.compose.ui.text.font.FontWeight.SemiBold),
                    color = colors.textPrimary,
                )
                Text(
                    text = "Download workout data as CSV",
                    style = typography.body,
                    color = colors.textSecondary,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
        }

        // --- DEV TOOLS section (admin only) ---
        if (state.userId == 1L) {
            SectionHeader(text = "DEV TOOLS")

            LwCard(onClick = onToggleSyncPreview) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Text(
                        text = "SYNC ANIMATION",
                        style = typography.body.copy(fontWeight = androidx.compose.ui.text.font.FontWeight.SemiBold),
                        color = colors.textPrimary,
                    )
                    Text(
                        text = "Preview first-login animation",
                        style = typography.body,
                        color = colors.textSecondary,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
            }
        }

        LwButton(
            text = "LOGOUT",
            onClick = onLogout,
            style = LwButtonStyle.Danger,
            fullWidth = true,
        )

        Spacer(modifier = Modifier.height(32.dp))
    }
}

@Composable
private fun SectionHeader(text: String) {
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography

    Text(
        text = text,
        style = typography.label.copy(letterSpacing = 1.sp),
        color = colors.textSecondary,
        modifier = Modifier.padding(top = 24.dp, bottom = 8.dp),
    )
}

@Composable
private fun NightModeToggle(
    enabled: Boolean,
    onToggle: () -> Unit,
) {
    val colors = LightweightTheme.colors

    val trackColor = if (enabled) colors.accentPrimary.copy(alpha = 0.3f) else colors.bgElevated
    val thumbColor = if (enabled) colors.accentPrimary else colors.textSecondary

    val trackWidth = 44.dp
    val trackHeight = 24.dp
    val thumbRadius = 9.dp

    Box(
        modifier = Modifier
            .size(width = trackWidth, height = MinTouchTarget)
            .clickable(
                indication = null,
                interactionSource = remember { MutableInteractionSource() },
                onClick = onToggle,
            )
            .drawBehind {
                val trackWidthPx = trackWidth.toPx()
                val trackHeightPx = trackHeight.toPx()
                val thumbRadiusPx = thumbRadius.toPx()
                val yOffset = (size.height - trackHeightPx) / 2f
                val cornerRadius = trackHeightPx / 2f

                // Track
                drawRoundRect(
                    color = trackColor,
                    topLeft = Offset(0f, yOffset),
                    size = Size(trackWidthPx, trackHeightPx),
                    cornerRadius = CornerRadius(cornerRadius, cornerRadius),
                )

                // Thumb
                val thumbX = if (enabled) {
                    trackWidthPx - cornerRadius
                } else {
                    cornerRadius
                }
                drawCircle(
                    color = thumbColor,
                    radius = thumbRadiusPx,
                    center = Offset(thumbX, yOffset + trackHeightPx / 2f),
                )
            },
        contentAlignment = Alignment.Center,
    ) {
        // Content is drawn via drawBehind
    }
}

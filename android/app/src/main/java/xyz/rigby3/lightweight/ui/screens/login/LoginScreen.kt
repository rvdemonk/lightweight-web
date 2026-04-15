package xyz.rigby3.lightweight.ui.screens.login

import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import xyz.rigby3.lightweight.ui.components.LwButton
import xyz.rigby3.lightweight.ui.components.LwButtonStyle
import xyz.rigby3.lightweight.ui.components.LwTextField
import xyz.rigby3.lightweight.ui.theme.LightweightTheme
import xyz.rigby3.lightweight.ui.theme.PagePadding

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit = {},
    onNavigateToRegister: () -> Unit = {},
    viewModel: LoginViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        viewModel.events.collect { event ->
            when (event) {
                LoginEvent.Success -> onLoginSuccess()
            }
        }
    }

    Crossfade(
        targetState = state.isSyncing,
        animationSpec = tween(300),
        label = "syncTransition",
    ) { syncing ->
        if (syncing) {
            SyncScreen()
        } else {
            LoginContent(
                state = state,
                onUsernameChange = viewModel::updateUsername,
                onPasswordChange = viewModel::updatePassword,
                onLogin = viewModel::login,
                onGoogleSignIn = { viewModel.googleSignIn(context) },
                onNavigateToRegister = onNavigateToRegister,
            )
        }
    }
}

@Composable
private fun LoginContent(
    state: LoginState,
    onUsernameChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onLogin: () -> Unit,
    onGoogleSignIn: () -> Unit,
    onNavigateToRegister: () -> Unit,
) {
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.bgPrimary)
            .then(Modifier),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        // Mark + Wordmark lockup
        Row(
            verticalAlignment = Alignment.CenterVertically,
        ) {
            LightweightMark(
                color = colors.accentPrimary,
                modifier = Modifier.size(44.dp),
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = "LIGHTWEIGHT",
                style = TextStyle(
                    fontFamily = typography.displayFamily,
                    fontSize = 54.sp,
                    fontWeight = FontWeight.W600,
                    letterSpacing = 1.5.sp,
                    lineHeight = 54.sp,
                ),
                color = colors.accentPrimary,
                modifier = Modifier.offset(y = (-4).dp),
            )
        }

        Spacer(modifier = Modifier.height(56.dp))

        Column(
            modifier = Modifier
                .width(280.dp),
        ) {
            LwTextField(
                value = state.username,
                onValueChange = onUsernameChange,
                placeholder = "USERNAME",
                isError = state.error != null,
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Text,
                    imeAction = ImeAction.Next,
                    autoCorrectEnabled = false,
                ),
            )

            Spacer(modifier = Modifier.height(12.dp))

            LwPasswordField(
                value = state.password,
                onValueChange = onPasswordChange,
                placeholder = "PASSWORD",
                isError = state.error != null,
                onDone = onLogin,
            )

            if (state.error != null) {
                Text(
                    text = state.error,
                    style = typography.body,
                    color = colors.accentRed,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.align(Alignment.CenterHorizontally),
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            LwButton(
                text = if (state.isLoading) "LOGGING IN..." else "LOGIN",
                onClick = onLogin,
                enabled = !state.isLoading,
                fullWidth = true,
            )

            Spacer(modifier = Modifier.height(16.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Spacer(
                    modifier = Modifier
                        .weight(1f)
                        .height(1.dp)
                        .background(colors.borderSubtle),
                )
                Text(
                    text = "OR",
                    style = typography.label,
                    color = colors.textSecondary,
                    modifier = Modifier.padding(horizontal = 12.dp),
                )
                Spacer(
                    modifier = Modifier
                        .weight(1f)
                        .height(1.dp)
                        .background(colors.borderSubtle),
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            LwButton(
                text = "SIGN IN WITH GOOGLE",
                onClick = onGoogleSignIn,
                enabled = !state.isLoading,
                fullWidth = true,
                style = LwButtonStyle.Secondary,
            )

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = "CREATE ACCOUNT",
                style = typography.label,
                color = colors.textSecondary,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .align(Alignment.CenterHorizontally)
                    .clickable(onClick = onNavigateToRegister),
            )
        }
    }
}

/**
 * The Lightweight geometric mark: square outline with angular triangle.
 * Drawn with glow (wider soft stroke behind crisp stroke).
 */
@Composable
private fun LightweightMark(
    color: Color,
    modifier: Modifier = Modifier,
) {
    val glowColor = color.copy(alpha = 0.35f)

    Canvas(modifier = modifier) {
        val pad = size.width * 0.05f
        val w = size.width - pad * 2
        val r = w * 0.04f // corner radius

        // Triangle points (from original SVG proportions)
        val triPath = Path().apply {
            moveTo(pad, pad)
            lineTo(pad + w, pad + w * 0.239f)
            lineTo(pad + w * 0.239f, pad + w)
            close()
        }

        // Glow layer (wider, semi-transparent)
        val glowStroke = Stroke(width = w * 0.08f, join = StrokeJoin.Round)
        drawRoundRect(
            color = glowColor,
            topLeft = Offset(pad, pad),
            size = Size(w, w),
            cornerRadius = CornerRadius(r, r),
            style = glowStroke,
        )
        drawPath(triPath, glowColor, style = glowStroke)

        // Crisp layer
        val crispStroke = Stroke(width = w * 0.045f, join = StrokeJoin.Round)
        drawRoundRect(
            color = color,
            topLeft = Offset(pad, pad),
            size = Size(w, w),
            cornerRadius = CornerRadius(r, r),
            style = crispStroke,
        )
        drawPath(triPath, color, style = crispStroke)
    }
}

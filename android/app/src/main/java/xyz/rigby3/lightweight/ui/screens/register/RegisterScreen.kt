package xyz.rigby3.lightweight.ui.screens.register

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
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
import xyz.rigby3.lightweight.ui.components.LwTextField
import xyz.rigby3.lightweight.ui.screens.login.LightweightMark
import xyz.rigby3.lightweight.ui.screens.login.LwPasswordField
import xyz.rigby3.lightweight.ui.theme.LightweightTheme

@Composable
fun RegisterScreen(
    onRegisterSuccess: () -> Unit = {},
    onNavigateToLogin: () -> Unit = {},
    viewModel: RegisterViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.events.collect { event ->
            when (event) {
                RegisterEvent.Success -> onRegisterSuccess()
            }
        }
    }

    RegisterContent(
        state = state,
        onUsernameChange = viewModel::updateUsername,
        onEmailChange = viewModel::updateEmail,
        onPasswordChange = viewModel::updatePassword,
        onRegister = viewModel::register,
        onNavigateToLogin = onNavigateToLogin,
    )
}

@Composable
private fun RegisterContent(
    state: RegisterState,
    onUsernameChange: (String) -> Unit,
    onEmailChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onRegister: () -> Unit,
    onNavigateToLogin: () -> Unit,
) {
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.bgPrimary),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        // Mark + Wordmark lockup (same as login)
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
            modifier = Modifier.width(280.dp),
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

            LwTextField(
                value = state.email,
                onValueChange = onEmailChange,
                placeholder = "EMAIL",
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Email,
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
                onDone = onRegister,
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
                text = if (state.isLoading) "CREATING..." else "CREATE ACCOUNT",
                onClick = onRegister,
                enabled = !state.isLoading,
                fullWidth = true,
            )

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = "ALREADY HAVE AN ACCOUNT?",
                style = typography.button,
                color = colors.textSecondary,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .align(Alignment.CenterHorizontally)
                    .clickable(onClick = onNavigateToLogin),
            )
        }
    }
}

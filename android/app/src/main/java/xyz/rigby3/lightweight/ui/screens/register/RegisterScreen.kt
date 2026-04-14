package xyz.rigby3.lightweight.ui.screens.register

import android.content.Context
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import xyz.rigby3.lightweight.ui.components.LwButton
import xyz.rigby3.lightweight.ui.components.LwButtonStyle
import xyz.rigby3.lightweight.ui.components.LwTextField
import xyz.rigby3.lightweight.ui.screens.login.LwPasswordField
import xyz.rigby3.lightweight.ui.theme.LightweightTheme

@Composable
fun RegisterScreen(
    onRegisterSuccess: () -> Unit = {},
    onNavigateToLogin: () -> Unit = {},
    viewModel: RegisterViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current

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
        onPasswordChange = viewModel::updatePassword,
        onRegister = viewModel::register,
        onGoogleSignIn = { viewModel.googleSignIn(context) },
        onNavigateToLogin = onNavigateToLogin,
    )
}

@Composable
private fun RegisterContent(
    state: RegisterState,
    onUsernameChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onRegister: () -> Unit,
    onGoogleSignIn: () -> Unit,
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
        Text(
            text = "CREATE ACCOUNT",
            style = typography.heroTitle,
            color = colors.accentPrimary,
        )

        Spacer(modifier = Modifier.height(56.dp))

        Column(
            modifier = Modifier.width(280.dp),
        ) {
            LwButton(
                text = "SIGN UP WITH GOOGLE",
                onClick = onGoogleSignIn,
                enabled = !state.isLoading,
                fullWidth = true,
                style = LwButtonStyle.Secondary,
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
                style = typography.label,
                color = colors.textSecondary,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .align(Alignment.CenterHorizontally)
                    .clickable(onClick = onNavigateToLogin),
            )
        }
    }
}

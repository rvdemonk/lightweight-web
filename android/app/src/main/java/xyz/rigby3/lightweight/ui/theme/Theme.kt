package xyz.rigby3.lightweight.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf

val LocalLightweightColors = staticCompositionLocalOf { DarkColors }
val LocalLightweightTypography = staticCompositionLocalOf { lightweightTypography() }

object LightweightTheme {
    val colors: LightweightColors
        @Composable @ReadOnlyComposable
        get() = LocalLightweightColors.current

    val typography: LightweightTypography
        @Composable @ReadOnlyComposable
        get() = LocalLightweightTypography.current
}

@Composable
fun LightweightTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colors = if (darkTheme) DarkColors else LightColors
    val typography = lightweightTypography()

    // Minimal Material 3 theme for Scaffold, Surface, etc.
    val materialColorScheme = if (darkTheme) {
        darkColorScheme(
            background = colors.bgPrimary,
            surface = colors.bgSurface,
            primary = colors.accentPrimary,
        )
    } else {
        lightColorScheme(
            background = colors.bgPrimary,
            surface = colors.bgSurface,
            primary = colors.accentPrimary,
        )
    }

    CompositionLocalProvider(
        LocalLightweightColors provides colors,
        LocalLightweightTypography provides typography,
    ) {
        MaterialTheme(
            colorScheme = materialColorScheme,
            content = content,
        )
    }
}

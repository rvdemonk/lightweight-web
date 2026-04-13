package xyz.rigby3.lightweight.ui.theme

import androidx.compose.ui.graphics.Color

data class LightweightColors(
    val bgPrimary: Color,
    val bgSurface: Color,
    val bgElevated: Color,
    val textPrimary: Color,
    val textSecondary: Color,
    val accentPrimary: Color,
    val accentCyan: Color,
    val accentGreen: Color,
    val accentRed: Color,
    val borderSubtle: Color,
    val borderActive: Color,
    val btnFilledText: Color,
    val overlayBg: Color,
    val isDark: Boolean,
)

val DarkColors = LightweightColors(
    bgPrimary = Color(0xFF07070D),
    bgSurface = Color(0xFF0C0C14),
    bgElevated = Color(0xFF14141F),
    textPrimary = Color(0xFFD4D4E0),
    textSecondary = Color(0xFF6A6A82),
    accentPrimary = Color(0xFFD4762C),
    accentCyan = Color(0xFF32C8E8),
    accentGreen = Color(0xFF32E868),
    accentRed = Color(0xFFE83232),
    borderSubtle = Color(0x33D4762C),
    borderActive = Color(0x59D4762C),
    btnFilledText = Color(0xFF07070D),
    overlayBg = Color(0xCC000000),
    isDark = true,
)

val LightColors = LightweightColors(
    bgPrimary = Color(0xFFE8E4DE),
    bgSurface = Color(0xFFDDD8D0),
    bgElevated = Color(0xFFD2CCC2),
    textPrimary = Color(0xFF1A1A2E),
    textSecondary = Color(0xFF5A5A72),
    accentPrimary = Color(0xFF0A7E8C),
    accentCyan = Color(0xFF0A7E8C),
    accentGreen = Color(0xFF28A850),
    accentRed = Color(0xFFCC2828),
    borderSubtle = Color(0x330A7E8C),
    borderActive = Color(0x590A7E8C),
    btnFilledText = Color(0xFFE8E4DE),
    overlayBg = Color(0x99000000),
    isDark = false,
)

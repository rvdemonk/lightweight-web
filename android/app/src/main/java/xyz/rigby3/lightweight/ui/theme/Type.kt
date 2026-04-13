package xyz.rigby3.lightweight.ui.theme

import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import xyz.rigby3.lightweight.R

val DisplayFamily = FontFamily(
    Font(R.font.barlow_condensed_medium, FontWeight.W500),
    Font(R.font.barlow_condensed_semibold, FontWeight.W600),
)

val BodyFamily = FontFamily(
    Font(R.font.barlow_regular, FontWeight.W400),
    Font(R.font.barlow_medium, FontWeight.W500),
    Font(R.font.barlow_semibold, FontWeight.W600),
)

val DataFamily = FontFamily(
    Font(R.font.jetbrains_mono_regular, FontWeight.W400),
    Font(R.font.jetbrains_mono_medium, FontWeight.W500),
    Font(R.font.jetbrains_mono_bold, FontWeight.W700),
)

data class LightweightTypography(
    val displayFamily: FontFamily,
    val bodyFamily: FontFamily,
    val dataFamily: FontFamily,
    val label: TextStyle,
    val cardTitle: TextStyle,
    val pageTitle: TextStyle,
    val button: TextStyle,
    val body: TextStyle,
    val data: TextStyle,
    val dataLarge: TextStyle,
)

fun lightweightTypography(
    display: FontFamily = DisplayFamily,
    body: FontFamily = BodyFamily,
    data: FontFamily = DataFamily,
) = LightweightTypography(
    displayFamily = display,
    bodyFamily = body,
    dataFamily = data,

    // Display: condensed sans — wordmarks, nav labels, headings, page titles
    // Weights: 500 standard, 600 emphasis. Letter-spacing 0.04–0.08em.
    label = TextStyle(
        fontFamily = display,
        fontSize = 11.sp,
        fontWeight = FontWeight.W500,
        letterSpacing = 0.5.sp,
    ),
    cardTitle = TextStyle(
        fontFamily = display,
        fontSize = 13.sp,
        fontWeight = FontWeight.W600,
        letterSpacing = 0.6.sp,
    ),
    pageTitle = TextStyle(
        fontFamily = display,
        fontSize = 18.sp,
        fontWeight = FontWeight.W600,
        letterSpacing = 1.sp,
    ),

    // Body: regular-width sans — exercise names, labels, body text, buttons, inputs
    // Weights: 400 standard, 500 emphasis, 600 headings.
    button = TextStyle(
        fontFamily = body,
        fontSize = 13.sp,
        fontWeight = FontWeight.W600,
        letterSpacing = 0.5.sp,
    ),
    body = TextStyle(
        fontFamily = body,
        fontSize = 14.sp,
        fontWeight = FontWeight.W400,
    ),

    // Data: monospace — weights, reps, e1RM, timers, set counts, all numeric data
    // Weights: 400 standard, 500 emphasis, 700 hero numbers.
    data = TextStyle(
        fontFamily = data,
        fontSize = 13.sp,
        fontWeight = FontWeight.W500,
    ),
    dataLarge = TextStyle(
        fontFamily = data,
        fontSize = 20.sp,
        fontWeight = FontWeight.W700,
    ),
)

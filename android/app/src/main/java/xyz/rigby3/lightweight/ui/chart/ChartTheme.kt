package xyz.rigby3.lightweight.ui.chart

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import xyz.rigby3.lightweight.ui.theme.DataFamily
import xyz.rigby3.lightweight.ui.theme.DisplayFamily
import xyz.rigby3.lightweight.ui.theme.LightweightTheme

// -- Chart Colors ---------------------------------------------------------

data class ChartColors(
    val grid: Color,
    val axisLabel: Color,
    val primary: Color,
    val secondary: Color,
    val positive: Color,
    val negative: Color,
    val surface: Color,
    val empty: Color,
)

@Composable
fun chartColors(): ChartColors {
    val c = LightweightTheme.colors
    return ChartColors(
        grid = c.textSecondary.copy(alpha = 0.2f),
        axisLabel = c.textSecondary,
        primary = c.accentPrimary,
        secondary = c.accentCyan,
        positive = c.accentGreen,
        negative = c.accentRed,
        surface = c.bgSurface,
        empty = c.bgElevated,
    )
}

// -- Chart Text Styles ----------------------------------------------------

data class ChartTextStyles(
    val axisLabel: TextStyle,
    val dataValue: TextStyle,
    val chartLabel: TextStyle,
)

@Composable
fun chartTextStyles(): ChartTextStyles {
    val labelColor = LightweightTheme.colors.textSecondary
    return ChartTextStyles(
        axisLabel = TextStyle(
            fontFamily = DataFamily,
            fontSize = ChartDefaults.AxisLabelSize,
            fontWeight = FontWeight.W400,
            color = labelColor,
        ),
        dataValue = TextStyle(
            fontFamily = DataFamily,
            fontSize = ChartDefaults.ChartLabelSize,
            fontWeight = FontWeight.W500,
            color = LightweightTheme.colors.textPrimary,
        ),
        chartLabel = TextStyle(
            fontFamily = DisplayFamily,
            fontSize = ChartDefaults.ChartLabelSize,
            fontWeight = FontWeight.W500,
            color = labelColor,
            letterSpacing = ChartDefaults.AxisLabelSize * 0.04f,
        ),
    )
}

// -- Chart Palette --------------------------------------------------------

object ChartPalette {
    // Upper body
    val UpperColor = Color(0xFFD4762C)  // amber
    val LowerColor = Color(0xFF32C8E8)  // cyan
    val CoreColor = Color(0xFF32E868)   // green

    val muscleGroupColors: Map<String, Color> = mapOf(
        "Back" to Color(0xFFD4762C),
        "Chest" to Color(0xFFE8A832),
        "Shoulders" to Color(0xFFE86432),
        "Biceps" to Color(0xFFC85028),
        "Triceps" to Color(0xFFD49032),
        "Forearms" to Color(0xFFA06828),
        "Quads" to Color(0xFF32C8E8),
        "Hamstrings" to Color(0xFF2896C8),
        "Glutes" to Color(0xFF3296D4),
        "Calves" to Color(0xFF28B4D4),
        "Core" to Color(0xFF32E868),
        "Other" to Color(0xFF6A6A82),
    )

    private val muscleSeriesColors = muscleGroupColors.values.toList()

    /** Colors for muscle group series (volume charts). */
    fun muscleColor(index: Int): Color = muscleSeriesColors[index % muscleSeriesColors.size]

    /** Maximally distinct colors for exercise comparison overlays (up to 6). */
    private val comparisonColors = listOf(
        Color(0xFFE8A832),  // amber/gold
        Color(0xFF32C8E8),  // cyan
        Color(0xFF32E868),  // green
        Color(0xFFE83232),  // red
        Color(0xFFA864E8),  // purple
        Color(0xFFE8E832),  // yellow
    )

    fun seriesColor(index: Int): Color = comparisonColors[index % comparisonColors.size]
}

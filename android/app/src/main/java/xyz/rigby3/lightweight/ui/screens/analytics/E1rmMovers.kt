package xyz.rigby3.lightweight.ui.screens.analytics

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import xyz.rigby3.lightweight.ui.chart.ChartColors
import xyz.rigby3.lightweight.ui.components.LwCard
import xyz.rigby3.lightweight.ui.theme.DataFamily
import xyz.rigby3.lightweight.ui.theme.LightweightTheme

@Composable
fun E1rmMovers(
    movers: MoversData,
    colors: ChartColors,
    modifier: Modifier = Modifier,
) {
    val typo = LightweightTheme.typography
    val themeColors = LightweightTheme.colors

    Column(modifier = modifier.fillMaxWidth()) {
        if (movers.gainers.isEmpty() && movers.losers.isEmpty()) {
            LwCard {
                Text(
                    text = "NEED 30+ DAYS OF DATA",
                    style = typo.label,
                    color = themeColors.textSecondary,
                )
            }
            return@Column
        }

        if (movers.gainers.isNotEmpty()) {
            Text(
                text = "RISING",
                style = typo.label,
                color = colors.positive,
                modifier = Modifier.padding(bottom = 8.dp),
            )
            LwCard {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    movers.gainers.forEach { item ->
                        MoverRow(item = item, pctColor = colors.positive, themeColors = themeColors)
                    }
                }
            }
        }

        if (movers.losers.isNotEmpty()) {
            Text(
                text = "DECLINING",
                style = typo.label,
                color = colors.negative,
                modifier = Modifier.padding(bottom = 8.dp),
            )
            LwCard {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    movers.losers.forEach { item ->
                        MoverRow(item = item, pctColor = colors.negative, themeColors = themeColors)
                    }
                }
            }
        }
    }
}

@Composable
private fun MoverRow(
    item: MoverItem,
    pctColor: androidx.compose.ui.graphics.Color,
    themeColors: xyz.rigby3.lightweight.ui.theme.LightweightColors,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = item.exerciseName,
                fontFamily = DataFamily,
                fontSize = 13.sp,
                fontWeight = FontWeight.W500,
                color = themeColors.textPrimary,
            )
            item.muscleGroup?.let {
                Text(
                    text = it,
                    fontFamily = DataFamily,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.W400,
                    color = themeColors.textSecondary,
                )
            }
        }

        Column(horizontalAlignment = Alignment.End) {
            val sign = if (item.pctChange >= 0) "+" else ""
            Text(
                text = "$sign${"%.1f".format(item.pctChange)}%",
                fontFamily = DataFamily,
                fontSize = 13.sp,
                fontWeight = FontWeight.W700,
                color = pctColor,
            )
            Text(
                text = "${"%.1f".format(item.currentE1rm)}kg",
                fontFamily = DataFamily,
                fontSize = 10.sp,
                fontWeight = FontWeight.W400,
                color = themeColors.textSecondary,
            )
        }
    }
}

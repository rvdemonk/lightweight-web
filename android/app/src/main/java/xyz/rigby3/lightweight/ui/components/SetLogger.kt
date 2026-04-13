package xyz.rigby3.lightweight.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableDoubleStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun SetLogger(
    defaultWeight: Double?,
    defaultReps: Int,
    onLog: (weightKg: Double?, reps: Int, rir: Int?) -> Unit,
    onWeightChange: (Double?) -> Unit = {},
    modifier: Modifier = Modifier,
) {
    var weight by remember(defaultWeight) { mutableStateOf(defaultWeight) }
    var reps by remember(defaultReps) { mutableDoubleStateOf(defaultReps.toDouble()) }
    var rir by remember { mutableStateOf<Double?>(null) }

    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        IncrementButton(
            value = weight,
            onValueChange = { weight = it; onWeightChange(it) },
            step = 1.25,
            min = 0.0,
            decimal = true,
            label = "WEIGHT (KG)",
        )

        IncrementButton(
            value = reps,
            onValueChange = { if (it != null) reps = it },
            step = 1.0,
            min = 1.0,
            label = "REPS",
        )

        IncrementButton(
            value = rir,
            onValueChange = { rir = it },
            step = 1.0,
            min = 0.0,
            nullable = true,
            muted = true,
            label = "RIR",
        )

        LwButton(
            text = "LOG SET",
            onClick = {
                val logWeight = when {
                    weight == null && defaultWeight == null -> null // bodyweight
                    weight == null -> 0.0
                    else -> weight
                }
                onLog(logWeight, reps.toInt(), rir?.toInt())
                // Keep weight, reset reps to same, reset RIR
                rir = null
            },
            style = LwButtonStyle.Primary,
            fullWidth = true,
            modifier = Modifier.padding(top = 8.dp),
        )
    }
}

package xyz.rigby3.lightweight.data.local

import xyz.rigby3.lightweight.data.local.entity.ExerciseEntity

/** Default exercises seeded on first login. Matches the web app's seed set. */
object SeedData {

    fun exercises(userId: Long): List<ExerciseEntity> = listOf(
        exercise(userId, "Bench Press", "chest", "barbell"),
        exercise(userId, "Incline Dumbbell Press", "chest", "dumbbell"),
        exercise(userId, "Cable Fly", "chest", "cable"),
        exercise(userId, "Barbell Row", "back", "barbell"),
        exercise(userId, "Lat Pulldown", "back", "cable"),
        exercise(userId, "Seated Cable Row", "back", "cable"),
        exercise(userId, "Overhead Press", "shoulders", "barbell"),
        exercise(userId, "Lateral Raise", "shoulders", "dumbbell"),
        exercise(userId, "Barbell Curl", "biceps", "barbell"),
        exercise(userId, "Hammer Curl", "biceps", "dumbbell"),
        exercise(userId, "Tricep Pushdown", "triceps", "cable"),
        exercise(userId, "Overhead Tricep Extension", "triceps", "cable"),
        exercise(userId, "Squat", "quads", "barbell"),
        exercise(userId, "Leg Press", "quads", "machine"),
        exercise(userId, "Romanian Deadlift", "hamstrings", "barbell"),
        exercise(userId, "Leg Curl", "hamstrings", "machine"),
        exercise(userId, "Calf Raise", "calves", "machine"),
    )

    private fun exercise(
        userId: Long,
        name: String,
        muscleGroup: String,
        equipment: String,
    ) = ExerciseEntity(
        userId = userId,
        name = name,
        muscleGroup = muscleGroup,
        equipment = equipment,
        createdAt = "",
    )
}

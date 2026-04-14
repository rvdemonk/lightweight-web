package xyz.rigby3.lightweight.data.local

import xyz.rigby3.lightweight.data.local.entity.ExerciseEntity

/** Comprehensive exercise library seeded on first login and backfilled on upgrade. */
object SeedData {

    fun exercises(userId: Long): List<ExerciseEntity> = listOf(
        // ── Chest ──
        ex(userId, "Barbell Bench Press", "BENCH", "chest", "barbell"),
        ex(userId, "Dumbbell Bench Press", "DB BENCH", "chest", "dumbbell"),
        ex(userId, "Incline Barbell Bench Press", "INCLINE BENCH", "chest", "barbell"),
        ex(userId, "Incline Dumbbell Bench Press", "INCLINE DB", "chest", "dumbbell"),
        ex(userId, "Decline Barbell Bench Press", "DECLINE BENCH", "chest", "barbell"),
        ex(userId, "Dumbbell Chest Fly", "DB FLY", "chest", "dumbbell"),
        ex(userId, "Cable Chest Fly", "CABLE FLY", "chest", "cable"),
        ex(userId, "Cable Crossover", "CROSSOVER", "chest", "cable"),
        ex(userId, "Machine Chest Press", "CHEST PRESS", "chest", "machine"),
        ex(userId, "Dip", "DIPS", "chest", "bodyweight"),
        ex(userId, "Push Up", "PUSH UPS", "chest", "bodyweight"),
        ex(userId, "Close Grip Bench Press", "CLOSE GRIP", "chest", "barbell"),

        // ── Back ──
        ex(userId, "Conventional Deadlift", "DEADS", "back", "barbell"),
        ex(userId, "Barbell Bent Over Row", "BB ROW", "back", "barbell"),
        ex(userId, "Dumbbell Row", "DB ROW", "back", "dumbbell"),
        ex(userId, "Pull Up", "PULL UPS", "back", "bodyweight"),
        ex(userId, "Chin Up", "CHIN UPS", "back", "bodyweight"),
        ex(userId, "Lat Pulldown", "LAT PULLDOWN", "back", "cable"),
        ex(userId, "Seated Cable Row", "CABLE ROW", "back", "cable"),
        ex(userId, "T-Bar Row", "T-BAR ROW", "back", "barbell"),
        ex(userId, "Chest Supported Row", "CHEST SUP ROW", "back", "dumbbell"),
        ex(userId, "Machine Row", "MACHINE ROW", "back", "machine"),
        ex(userId, "Cable Pullover", "CABLE PULL", "back", "cable"),
        ex(userId, "Straight Arm Pulldown", "SA PULLDOWN", "back", "cable"),
        ex(userId, "Rack Pull", "RACK PULL", "back", "barbell"),

        // ── Shoulders ──
        ex(userId, "Barbell Overhead Press", "OHP", "shoulders", "barbell"),
        ex(userId, "Dumbbell Overhead Press", "DB OHP", "shoulders", "dumbbell"),
        ex(userId, "Dumbbell Lateral Raise", "LAT RAISE", "shoulders", "dumbbell"),
        ex(userId, "Cable Lateral Raise", "CABLE LAT RSE", "shoulders", "cable"),
        ex(userId, "Dumbbell Front Raise", "FRONT RAISE", "shoulders", "dumbbell"),
        ex(userId, "Barbell Upright Row", "UPRIGHT ROW", "shoulders", "barbell"),
        ex(userId, "Face Pull", "FACE PULL", "shoulders", "cable"),
        ex(userId, "Reverse Pec Deck", "REV PEC DECK", "shoulders", "machine"),
        ex(userId, "Machine Shoulder Press", "SHOULDER PRS", "shoulders", "machine"),
        ex(userId, "Arnold Press", "ARNOLD PRESS", "shoulders", "dumbbell"),
        ex(userId, "Dumbbell Rear Delt Fly", "REAR DELT FLY", "shoulders", "dumbbell"),

        // ── Biceps ──
        ex(userId, "Barbell Curl", "BB CURL", "biceps", "barbell"),
        ex(userId, "Dumbbell Curl", "DB CURL", "biceps", "dumbbell"),
        ex(userId, "Incline Dumbbell Curl", "INCLINE CURL", "biceps", "dumbbell"),
        ex(userId, "Hammer Curl", "HAMMER CURL", "biceps", "dumbbell"),
        ex(userId, "Cable Curl", "CABLE CURL", "biceps", "cable"),
        ex(userId, "Preacher Curl", "PREACHER CURL", "biceps", "barbell"),
        ex(userId, "Concentration Curl", "CONC CURL", "biceps", "dumbbell"),
        ex(userId, "EZ Bar Curl", "EZ CURL", "biceps", "barbell"),

        // ── Triceps ──
        ex(userId, "Cable Tricep Pushdown", "PUSHDOWN", "triceps", "cable"),
        ex(userId, "Overhead Cable Extension", "OH CABLE EXT", "triceps", "cable"),
        ex(userId, "Dumbbell Overhead Extension", "DB OH EXT", "triceps", "dumbbell"),
        ex(userId, "Skull Crusher", "SKULL CRUSHER", "triceps", "barbell"),
        ex(userId, "Tricep Dip", "TRICEP DIP", "triceps", "bodyweight"),
        ex(userId, "Cable Rope Pushdown", "ROPE PUSHDOWN", "triceps", "cable"),
        ex(userId, "Diamond Push Up", "DIAMOND PU", "triceps", "bodyweight"),
        ex(userId, "Dumbbell Kickback", "KICKBACK", "triceps", "dumbbell"),

        // ── Quads ──
        ex(userId, "Barbell Back Squat", "SQUAT", "quads", "barbell"),
        ex(userId, "Barbell Front Squat", "FRONT SQUAT", "quads", "barbell"),
        ex(userId, "Leg Press", "LEG PRESS", "quads", "machine"),
        ex(userId, "Hack Squat", "HACK SQUAT", "quads", "machine"),
        ex(userId, "Goblet Squat", "GOBLET SQUAT", "quads", "dumbbell"),
        ex(userId, "Walking Lunge", "WALKING LUNGE", "quads", "dumbbell"),
        ex(userId, "Barbell Reverse Lunge", "REV LUNGE", "quads", "barbell"),
        ex(userId, "Bulgarian Split Squat", "BULGARIAN", "quads", "dumbbell"),
        ex(userId, "Leg Extension", "LEG EXT", "quads", "machine"),
        ex(userId, "Smith Machine Squat", "SMITH SQUAT", "quads", "smith machine"),

        // ── Hamstrings ──
        ex(userId, "Romanian Deadlift", "RDL", "hamstrings", "barbell"),
        ex(userId, "Dumbbell Romanian Deadlift", "DB RDL", "hamstrings", "dumbbell"),
        ex(userId, "Lying Leg Curl", "LEG CURL", "hamstrings", "machine"),
        ex(userId, "Seated Leg Curl", "SEATED LEG C", "hamstrings", "machine"),
        ex(userId, "Good Morning", "GOOD MORNING", "hamstrings", "barbell"),
        ex(userId, "Nordic Hamstring Curl", "NORDIC CURL", "hamstrings", "bodyweight"),
        ex(userId, "Kettlebell Swing", "KB SWING", "hamstrings", "kettlebell"),

        // ── Glutes ──
        ex(userId, "Barbell Hip Thrust", "HIP THRUST", "glutes", "barbell"),
        ex(userId, "Cable Pull Through", "PULL THROUGH", "glutes", "cable"),
        ex(userId, "Glute Bridge", "GLUTE BRIDGE", "glutes", "bodyweight"),
        ex(userId, "Cable Kickback", "CABLE KICK", "glutes", "cable"),
        ex(userId, "Sumo Deadlift", "SUMO DEAD", "glutes", "barbell"),
        ex(userId, "Step Up", "STEP UP", "glutes", "dumbbell"),
        ex(userId, "Dumbbell Hip Thrust", "DB HIP THRST", "glutes", "dumbbell"),

        // ── Calves ──
        ex(userId, "Standing Calf Raise", "CALF RAISE", "calves", "machine"),
        ex(userId, "Seated Calf Raise", "SEATED CALF", "calves", "machine"),
        ex(userId, "Smith Machine Calf Raise", "SMITH CALF", "calves", "smith machine"),
        ex(userId, "Leg Press Calf Raise", "LP CALF RAISE", "calves", "machine"),

        // ── Core ──
        ex(userId, "Hanging Leg Raise", "HANGING LEG", "core", "bodyweight"),
        ex(userId, "Cable Crunch", "CABLE CRUNCH", "core", "cable"),
        ex(userId, "Ab Rollout", "AB ROLLOUT", "core", "bodyweight"),
        ex(userId, "Plank", "PLANK", "core", "bodyweight"),
        ex(userId, "Russian Twist", "RUSSIAN TWIST", "core", "dumbbell"),
        ex(userId, "Decline Sit Up", "DECLINE SITUP", "core", "bodyweight"),
        ex(userId, "Pallof Press", "PALLOF PRESS", "core", "cable"),
        ex(userId, "Woodchop", "WOODCHOP", "core", "cable"),

        // ── Forearms ──
        ex(userId, "Barbell Wrist Curl", "WRIST CURL", "forearms", "barbell"),
        ex(userId, "Reverse Barbell Curl", "REVERSE CURL", "forearms", "barbell"),
        ex(userId, "Farmer's Walk", "FARMERS WALK", "forearms", "dumbbell"),
        ex(userId, "Dead Hang", "DEAD HANG", "forearms", "bodyweight"),
    )

    /** Map of exercise name -> short_name for backfilling existing users. */
    val shortNameMap: Map<String, String> by lazy {
        val fromSeed = exercises(0L)
            .associate { it.name to (it.shortName ?: "") }
            .filterValues { it.isNotEmpty() }

        // Legacy names from the Rust backend seed (may differ from Android names)
        val legacy = mapOf(
            "Incline Barbell Bench" to "INCLINE BENCH",
            "DB Chest Flies" to "DB FLY",
            "Weighted Push-ups" to "PUSH UPS",
            "Barbell Bent Row" to "BB ROW",
            "Chin-ups" to "CHIN UPS",
            "Egyptian Raises" to "EGYPTIAN RSE",
            "DB Overhead Press" to "DB OHP",
            "Seated Incline DB Curls" to "SEATED INC C",
            "Barbell Curls" to "BB CURL",
            "Overhead DB Tricep Extension" to "DB OH EXT",
            "Back Squat" to "SQUAT",
            "Walking Lunges" to "WALKING LUNGE",
            "Reverse Lunges" to "REV LUNGE",
            "Good Mornings" to "GOOD MORNING",
            "Hanging Leg Raise" to "HANGING LEG",
            "Standing Calf Raise" to "CALF RAISE",
            "EZ Curl Bar Tricep Extension" to "EZ TRICEP EXT",
            "Briefcase Carry" to "BRIEFCASE",
            "Bent Over Row" to "BENT OVER ROW",
        )

        fromSeed + legacy
    }

    private fun ex(
        userId: Long,
        name: String,
        shortName: String,
        muscleGroup: String,
        equipment: String,
    ) = ExerciseEntity(
        userId = userId,
        name = name,
        shortName = shortName,
        muscleGroup = muscleGroup,
        equipment = equipment,
        createdAt = "",
    )
}

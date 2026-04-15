# Exercise Library Draft

Date: 2026-04-14

Comprehensive exercise library for Lightweight. Each exercise that can be performed with multiple equipment types gets a separate entry. The `short_name` field (max 14 chars, uppercase) is the abbreviated display name for tight UI spaces -- gym-bro shorthand that is instantly recognizable.

## Fields

- **name**: Full descriptive name, title case. Equipment included when it disambiguates.
- **short_name**: Max 14 characters, uppercase. Common gym shorthand.
- **muscle_group**: One of: chest, back, shoulders, biceps, triceps, quads, hamstrings, glutes, calves, core, forearms
- **equipment**: One of: barbell, dumbbell, cable, machine, bodyweight, kettlebell, band, smith machine

## Chest (12)

| name | short_name | muscle_group | equipment |
|------|-----------|-------------|-----------|
| Barbell Bench Press | BENCH | chest | barbell |
| Dumbbell Bench Press | DB BENCH | chest | dumbbell |
| Incline Barbell Bench Press | INCLINE BENCH | chest | barbell |
| Incline Dumbbell Bench Press | INCLINE DB | chest | dumbbell |
| Decline Barbell Bench Press | DECLINE BENCH | chest | barbell |
| Dumbbell Chest Fly | DB FLY | chest | dumbbell |
| Cable Chest Fly | CABLE FLY | chest | cable |
| Cable Crossover | CROSSOVER | chest | cable |
| Machine Chest Press | CHEST PRESS | chest | machine |
| Dip | DIPS | chest | bodyweight |
| Push Up | PUSH UPS | chest | bodyweight |
| Close Grip Bench Press | CLOSE GRIP | chest | barbell |

## Back (13)

| name | short_name | muscle_group | equipment |
|------|-----------|-------------|-----------|
| Conventional Deadlift | DEADS | back | barbell |
| Barbell Bent Over Row | BB ROW | back | barbell |
| Dumbbell Row | DB ROW | back | dumbbell |
| Pull Up | PULL UPS | back | bodyweight |
| Chin Up | CHIN UPS | back | bodyweight |
| Lat Pulldown | LAT PULLDOWN | back | cable |
| Seated Cable Row | CABLE ROW | back | cable |
| T-Bar Row | T-BAR ROW | back | barbell |
| Chest Supported Row | CHEST SUP ROW | back | dumbbell |
| Machine Row | MACHINE ROW | back | machine |
| Cable Pullover | CABLE PULL | back | cable |
| Straight Arm Pulldown | STR ARM PULL | back | cable |
| Rack Pull | RACK PULL | back | barbell |

## Shoulders (11)

| name | short_name | muscle_group | equipment |
|------|-----------|-------------|-----------|
| Barbell Overhead Press | OHP | shoulders | barbell |
| Dumbbell Overhead Press | DB OHP | shoulders | dumbbell |
| Dumbbell Lateral Raise | LAT RAISE | shoulders | dumbbell |
| Cable Lateral Raise | CABLE LAT RSE | shoulders | cable |
| Dumbbell Front Raise | FRONT RAISE | shoulders | dumbbell |
| Barbell Upright Row | UPRIGHT ROW | shoulders | barbell |
| Face Pull | FACE PULL | shoulders | cable |
| Reverse Pec Deck | REV PEC DECK | shoulders | machine |
| Machine Shoulder Press | SHOULDER PRES | shoulders | machine |
| Arnold Press | ARNOLD PRESS | shoulders | dumbbell |
| Dumbbell Rear Delt Fly | REAR DELT FLY | shoulders | dumbbell |

## Biceps (8)

| name | short_name | muscle_group | equipment |
|------|-----------|-------------|-----------|
| Barbell Curl | BB CURL | biceps | barbell |
| Dumbbell Curl | DB CURL | biceps | dumbbell |
| Incline Dumbbell Curl | INCLINE CURL | biceps | dumbbell |
| Hammer Curl | HAMMER CURL | biceps | dumbbell |
| Cable Curl | CABLE CURL | biceps | cable |
| Preacher Curl | PREACHER CURL | biceps | barbell |
| Concentration Curl | CONC CURL | biceps | dumbbell |
| EZ Bar Curl | EZ CURL | biceps | barbell |

## Triceps (8)

| name | short_name | muscle_group | equipment |
|------|-----------|-------------|-----------|
| Cable Tricep Pushdown | PUSHDOWN | triceps | cable |
| Overhead Cable Extension | OH CABLE EXT | triceps | cable |
| Dumbbell Overhead Extension | DB OH EXT | triceps | dumbbell |
| Skull Crusher | SKULL CRUSHER | triceps | barbell |
| Tricep Dip | TRICEP DIP | triceps | bodyweight |
| Cable Rope Pushdown | ROPE PUSHDOWN | triceps | cable |
| Diamond Push Up | DIAMOND PU | triceps | bodyweight |
| Dumbbell Kickback | KICKBACK | triceps | dumbbell |

## Quads (10)

| name | short_name | muscle_group | equipment |
|------|-----------|-------------|-----------|
| Barbell Back Squat | SQUAT | quads | barbell |
| Barbell Front Squat | FRONT SQUAT | quads | barbell |
| Leg Press | LEG PRESS | quads | machine |
| Hack Squat | HACK SQUAT | quads | machine |
| Goblet Squat | GOBLET SQUAT | quads | dumbbell |
| Walking Lunge | WALKING LUNGE | quads | dumbbell |
| Barbell Reverse Lunge | REV LUNGE | quads | barbell |
| Bulgarian Split Squat | BULGARIAN | quads | dumbbell |
| Leg Extension | LEG EXT | quads | machine |
| Smith Machine Squat | SMITH SQUAT | quads | smith machine |

## Hamstrings (7)

| name | short_name | muscle_group | equipment |
|------|-----------|-------------|-----------|
| Romanian Deadlift | RDL | hamstrings | barbell |
| Dumbbell Romanian Deadlift | DB RDL | hamstrings | dumbbell |
| Lying Leg Curl | LEG CURL | hamstrings | machine |
| Seated Leg Curl | SEATED CURL | hamstrings | machine |
| Good Morning | GOOD MORNING | hamstrings | barbell |
| Nordic Hamstring Curl | NORDIC CURL | hamstrings | bodyweight |
| Kettlebell Swing | KB SWING | hamstrings | kettlebell |

## Glutes (7)

| name | short_name | muscle_group | equipment |
|------|-----------|-------------|-----------|
| Barbell Hip Thrust | HIP THRUST | glutes | barbell |
| Cable Pull Through | PULL THROUGH | glutes | cable |
| Glute Bridge | GLUTE BRIDGE | glutes | bodyweight |
| Cable Kickback | CABLE KICK | glutes | cable |
| Sumo Deadlift | SUMO DEAD | glutes | barbell |
| Step Up | STEP UP | glutes | dumbbell |
| Dumbbell Hip Thrust | DB HIP THRST | glutes | dumbbell |

## Calves (4)

| name | short_name | muscle_group | equipment |
|------|-----------|-------------|-----------|
| Standing Calf Raise | CALF RAISE | calves | machine |
| Seated Calf Raise | SEATED CALF | calves | machine |
| Smith Machine Calf Raise | SMITH CALF | calves | smith machine |
| Leg Press Calf Raise | LP CALF RAISE | calves | machine |

## Core (8)

| name | short_name | muscle_group | equipment |
|------|-----------|-------------|-----------|
| Hanging Leg Raise | HANGING LEG | core | bodyweight |
| Cable Crunch | CABLE CRUNCH | core | cable |
| Ab Rollout | AB ROLLOUT | core | bodyweight |
| Plank | PLANK | core | bodyweight |
| Russian Twist | RUSSIAN TWIST | core | dumbbell |
| Decline Sit Up | DECLINE SITUP | core | bodyweight |
| Pallof Press | PALLOF PRESS | core | cable |
| Woodchop | WOODCHOP | core | cable |

## Forearms (4)

| name | short_name | muscle_group | equipment |
|------|-----------|-------------|-----------|
| Barbell Wrist Curl | WRIST CURL | forearms | barbell |
| Reverse Barbell Curl | REVERSE CURL | forearms | barbell |
| Farmer's Walk | FARMERS WALK | forearms | dumbbell |
| Dead Hang | DEAD HANG | forearms | bodyweight |

## Summary

| Muscle Group | Count |
|-------------|-------|
| Chest | 12 |
| Back | 13 |
| Shoulders | 11 |
| Biceps | 8 |
| Triceps | 8 |
| Quads | 10 |
| Hamstrings | 7 |
| Glutes | 7 |
| Calves | 4 |
| Core | 8 |
| Forearms | 4 |
| **Total** | **92** |

## Notes

- The existing 17 seed exercises map into this library. Some names change for consistency (e.g., "DB Chest Flies" becomes "Dumbbell Chest Fly", "Barbell Bent Row" becomes "Barbell Bent Over Row").
- `short_name` is implemented in the Android Room schema (v2→v3 migration). Not yet added to the Rust backend.
- Equipment values are normalized to lowercase singular forms in Android. The Rust backend still uses the original casing — normalize during a future migration.
- "Close Grip Bench Press" is listed under chest (primary mover is still pectorals, though triceps are heavily involved). Could be argued either way.
- "Dip" is under chest; "Tricep Dip" is under triceps. The distinction is body lean angle, but since they're commonly thought of as different exercises, both are included.
- "Conventional Deadlift" is under back; "Sumo Deadlift" is under glutes; "Romanian Deadlift" is under hamstrings. These reflect the primary emphasis of each variation.
- All `short_name` values are verified to be 14 characters or fewer.

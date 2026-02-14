# Lightweight

Single-user workout tracker optimized for frictionless mobile logging. Rust backend + React frontend, single binary deployment.

## Features

- Progressive overload tracking
- One-handed mobile use between sets
- NGE-influenced dark aesthetic (angular, monospace data, amber/cyan accents)
- Single-user, self-hosted, no cloud dependencies
- CLI for programmatic access and data import

## Tech Stack

- **Backend**: Rust (Axum + SQLite)
- **Frontend**: React + TypeScript (Vite)
- **CLI**: Rust (`lw` binary)
- **Deployment**: Single binary with embedded frontend

## Quick Start

### Prerequisites

- Rust (via rustup)
- Node.js 18+ (for frontend development)

### Development Mode

Start the backend:
```bash
cargo run -p lightweight-server
```

Start the frontend (in a separate terminal):
```bash
cd frontend
npm install
npm run dev
```

Access the app at `http://localhost:5173`

## CLI Usage

The `lw` CLI provides programmatic access to your workout data.

### Build & Install

```bash
# Build the CLI
cargo build --release -p lightweight-cli

# Optionally install to cargo bin path
cargo install --path crates/cli
```

### Configuration

First, login to save your authentication token:

```bash
lw login
```

This prompts for your server URL and credentials, then saves a config file to `~/.config/lightweight/config.toml`.

### Commands

#### Exercises

```bash
# List all exercises
lw exercises list

# Add a new exercise
lw exercises add --name "Barbell Squat" --category "legs"
```

#### Templates (Workouts)

```bash
# List all workout templates
lw templates list

# Show detailed template with exercises
lw templates show --id 1
```

#### Sessions

```bash
# List recent workout sessions
lw sessions list

# Start a new workout from a template
lw sessions start --template-id 1

# Log a set during active session
lw sessions log --exercise-id 5 --weight 100 --reps 8

# End the active session
lw sessions end
```

#### Data Import

Bulk import complete sessions from a JSON file. Exercise names are fuzzy-matched against existing exercises; unrecognised names are auto-created.

```bash
lw import --file workouts.json
```

JSON format — array of sessions with exercises and sets inline:

```json
[{
  "template": "Upper A",
  "date": "2026-02-02",
  "notes": "Felt strong",
  "exercises": [{
    "name": "Incline Barbell Bench",
    "sets": [
      { "weight_kg": 60, "reps": 8 },
      { "weight_kg": 60, "reps": 8 }
    ]
  }]
}]
```

Fields: `template` (optional, matched by name), `date` (YYYY-MM-DD, required), `notes` (optional), `exercises[].name` (fuzzy-matched), `exercises[].sets[].set_type` (optional, defaults to "working").

The same payload can be POSTed directly to `POST /api/v1/sessions/import`.

## Development

### Backend

```bash
cargo run -p lightweight-server
```

Runs on port 3000. Configure via environment variables:
- `LW_DB_PATH` - database location (default: `./dev.db`)
- `LW_PORT` - server port (default: `3000`)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on port 5173, proxies `/api` to backend.

### Type Checking

```bash
# Check Rust code
cargo check

# Check TypeScript code
cd frontend && npx tsc --noEmit
```

### Building for Production

```bash
# Build frontend first (rust-embed requires dist/)
cd frontend && npm run build && cd ..

# Build single binary
cargo build --release -p lightweight-server
```

Binary at `target/release/lightweight-server` includes embedded frontend assets.

Optionally build the CLI:
```bash
cargo build --release -p lightweight-cli
```

## Architecture

```
lightweight-web/
├── crates/
│   ├── core/          # Shared types, DB logic, models
│   ├── server/        # Axum web server, API routes
│   └── cli/           # lw CLI tool
├── frontend/          # React + TypeScript SPA
├── migrations/        # SQLite schema migrations
└── scripts/           # Build & deploy scripts
```

## Database

SQLite migrations in `migrations/`. Applied automatically on server start.

Seed data includes:
- 17 common exercises (bench press, squat, deadlift, etc.)
- 4 sample workout templates (Push, Pull, Legs, Full Body)

## License

Personal use project.

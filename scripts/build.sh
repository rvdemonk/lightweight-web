#!/bin/bash
set -euo pipefail

echo "=== Building Lightweight ==="

# Build frontend
echo "Building frontend..."
cd frontend
npm ci
npm run build
cd ..

# Build Rust (release)
echo "Building server..."
cargo build --release -p lightweight-server

echo ""
echo "Build complete: target/release/lightweight-server"
echo "Run with: ./target/release/lightweight-server"

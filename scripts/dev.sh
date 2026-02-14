#!/bin/bash
# Start backend and frontend dev servers. Ctrl+C kills both.
trap 'kill 0' EXIT

export PATH="$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node" | tail -1)/bin:$PATH"

cargo run -p lightweight-server &
cd frontend && npm run dev &
wait

#!/bin/bash
set -e

REMOTE=root@170.64.189.221
TARGET=x86_64-unknown-linux-gnu

echo "Building frontend..."
cd frontend && npm ci && npm run build && cd ..

echo "Cross-compiling for $TARGET..."
cargo zigbuild --release -p lightweight-server --target $TARGET

echo "Deploying to droplet..."
scp target/$TARGET/release/lightweight-server $REMOTE:/var/www/lightweight/
scp migrations/*.sql $REMOTE:/var/www/lightweight/migrations/

echo "Restarting service..."
ssh $REMOTE "systemctl restart lightweight"

echo "Deployed to https://lightweight.3rigby.xyz"

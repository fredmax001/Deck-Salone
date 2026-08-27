#!/bin/bash
set -e

echo "📱 Deck Salone Android AAB Bundle Script"
echo "=========================================="

export JAVA_HOME="/opt/homebrew/opt/openjdk@21"
export ANDROID_HOME="/Users/djfredmax/Library/Android/sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools:$PATH"

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$PROJECT_ROOT/app"
ANDROID_DIR="$APP_DIR/android"

echo "📦 Step 1/4 — Building web app assets (targeting app.decksalone.com)..."
cd "$APP_DIR"
VITE_API_URL="https://app.decksalone.com/api" npm run build

echo "⚡ Step 2/4 — Syncing web assets to Capacitor Android..."
npx cap sync android

echo "🧹 Step 3/4 — Removing compressed asset duplicates..."
find "$ANDROID_DIR/app/src/main/assets/public" -type f \( -name "*.gz" -o -name "*.br" \) -delete || true

echo "🔨 Step 4/4 — Compiling Android App Bundle (AAB) via Gradle..."
cd "$ANDROID_DIR"
./gradlew bundleRelease bundleDebug

cp "$ANDROID_DIR/app/build/outputs/bundle/release/app-release.aab" "$PROJECT_ROOT/deck-salone-release.aab"
cp "$ANDROID_DIR/app/build/outputs/bundle/debug/app-debug.aab" "$PROJECT_ROOT/deck-salone-debug.aab"

echo "=========================================="
echo "🎉 SUCCESS! Deck Salone AAB bundles ready at:"
echo "Release: $PROJECT_ROOT/deck-salone-release.aab"
echo "Debug:   $PROJECT_ROOT/deck-salone-debug.aab"
echo "=========================================="

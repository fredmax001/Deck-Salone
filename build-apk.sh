#!/bin/bash
set -e

echo "📱 Deck Salone Android APK Build Script"
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

echo "⚡ Step 2/4 — Syncing web assets to Capacitor Android (with live backend URL)..."
npx cap sync android

echo "🧹 Step 3/4 — Removing compressed asset duplicates..."
find "$ANDROID_DIR/app/src/main/assets/public" -type f \( -name "*.gz" -o -name "*.br" \) -delete || true

echo "🔨 Step 4/4 — Compiling Android APK via Gradle..."
cd "$ANDROID_DIR"
./gradlew assembleDebug

cp "$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk" "$PROJECT_ROOT/deck-salone-debug.apk"

echo "=========================================="
echo "🎉 SUCCESS! Deck Salone APK ready at:"
echo "$PROJECT_ROOT/deck-salone-debug.apk"
echo "=========================================="


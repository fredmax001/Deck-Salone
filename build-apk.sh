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

echo "📦 Step 1/4 — Building web app assets (targeting decksalone.com)..."
cd "$APP_DIR"
VITE_API_URL="https://decksalone.com/api" npm run build

echo "⚡ Step 2/4 — Syncing web assets to Capacitor Android (with live backend URL)..."
npx cap sync android

echo "🧹 Step 3/4 — Removing compressed asset duplicates..."
find "$ANDROID_DIR/app/src/main/assets/public" -type f \( -name "*.gz" -o -name "*.br" \) -delete || true

echo "🔨 Step 4/4 — Compiling Android APK via Gradle (Release + Debug)..."
cd "$ANDROID_DIR"
./gradlew assembleRelease assembleDebug

mkdir -p "$PROJECT_ROOT/uploads/apk"
mkdir -p "$APP_DIR/uploads/apk"

if [ -f "$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk" ]; then
  cp "$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk" "$PROJECT_ROOT/DeckSalone-1.4.0.apk"
  cp "$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk" "$PROJECT_ROOT/deck-salone-release.apk"
  cp "$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk" "$PROJECT_ROOT/uploads/apk/DeckSalone-1.4.0.apk"
  cp "$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk" "$APP_DIR/uploads/apk/DeckSalone-1.4.0.apk"
fi

if [ -f "$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk" ]; then
  cp "$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk" "$PROJECT_ROOT/deck-salone-debug.apk"
fi

echo "=========================================="
echo "🎉 SUCCESS! Deck Salone APKs ready at:"
echo "Signed Release: $PROJECT_ROOT/DeckSalone-1.4.0.apk"
echo "Release:        $PROJECT_ROOT/deck-salone-release.apk"
echo "Debug:          $PROJECT_ROOT/deck-salone-debug.apk"
echo "=========================================="


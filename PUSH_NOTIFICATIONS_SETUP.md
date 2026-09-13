# Push Notifications Setup (Firebase Cloud Messaging)

The app now supports **real server push notifications** via FCM on the Android
app (web/browser still uses in-app + local notifications). Everything is
implemented; it activates as soon as the Firebase keys below are in place.

## 1. Create a Firebase project

1. Go to https://console.firebase.google.com → **Add project** (e.g. `deck-salone`).
2. Project settings → **Service accounts** → **Generate new private key**.
   Save the downloaded JSON as your **service-account key** (server-side).

## 2. Android app (`google-services.json`)

1. Firebase console → Project settings → **Add app** → Android.
   - Package name: `decksalone.com`
   - App nickname: Deck Salone
2. Download `google-services.json` and place it at:

   ```
   app/android/app/google-services.json
   ```

   The build automatically applies the `google-services` Gradle plugin **only
   when this file exists**, so builds without it keep working (push simply
   stays off).

3. Rebuild the app:

   ```bash
   cd app
   npx cap sync android
   # then build the APK/AAB as usual (Android Studio or ./gradlew)
   ```

## 3. Backend (service-account key)

1. Copy the service-account JSON from step 1 onto the server, e.g.
   `/app/secrets/firebase-service-account.json` (outside the repo — never commit it).
2. Set the env vars (see `app/.env.example`):

   ```bash
   FCM_SERVICE_ACCOUNT_PATH=/app/secrets/firebase-service-account.json
   FCM_PROJECT_ID=your-firebase-project-id
   ```

3. Restart the API. While these are unset, `sendPushToUser()` is a no-op and
   the existing notification flows are unaffected.

## 4. Database

Migration `20260913150640_add_push_tokens` creates the `push_tokens` table.
It runs automatically on deploy via `prisma migrate deploy`.

## How it works

- On launch (logged in, native app), the app requests notification permission,
  gets the FCM token, and stores it via `POST /api/notifications/push-token`.
- Every in-app notification created by the backend (`createNotification`) is
  also sent as a push, respecting the same `push*` preferences as in-app
  notifications.
- Tapping a push notification opens the app and navigates to its `actionUrl`.
- On logout, tokens are removed (`DELETE /api/notifications/push-token`).
- Until FCM keys are live, the existing 45s local-notification poller keeps
  working as the fallback.

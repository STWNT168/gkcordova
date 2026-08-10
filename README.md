# GK Memory Deck — Cordova app

A spaced-repetition flashcard app (SM-2 scheduling, same idea as Anki) built from
your SSC GK-GS question bank — 8,226 questions across 20 topics. Progress is saved
with `localStorage`, which persists on the device across app restarts (it's cleared
only if you uninstall the app or manually clear its storage).

This is a source project, not a built app — you'll build the actual installable
APK/IPA yourself using the steps below. I can't compile it for you in this chat
(no Android/iOS build tools or network access here), but everything is ready to go.

## What's inside
```
config.xml          Cordova app config (id, name, permissions)
package.json         Node/Cordova dependency list
www/index.html        App shell
www/css/style.css     All styling
www/js/app.js          App logic + SM-2 scheduler (uses localStorage, not the web)
www/data/cards.json    The 8,226 extracted question/answer pairs (~5.4MB)
```

## One-time setup on your computer
You need Node.js installed (which gives you `npm`), then:

```bash
npm install -g cordova
cd gk-cordova-app
npm install
```

## Android (most common — works on any Windows/Mac/Linux machine)
1. Install [Android Studio](https://developer.android.com/studio) — this also
   installs the Android SDK that Cordova needs. Open it once so it finishes
   installing platform tools.
2. From the project folder:
   ```bash
   cordova platform add android
   cordova build android
   ```
3. The debug APK lands at:
   `platforms/android/app/build/outputs/apk/debug/app-debug.apk`
4. Copy that APK to your phone (e.g. via USB, or upload it somewhere you can
   download it from) and tap it to install. You'll need to allow "install
   unknown apps" for whichever app you use to open it — Android will prompt you.

   Or, with your phone connected via USB and USB debugging enabled:
   ```bash
   cordova run android
   ```
   installs and launches it directly.

## iOS (requires a Mac with Xcode)
```bash
cordova platform add ios
cordova build ios
```
Then open `platforms/ios/*.xcworkspace` in Xcode, sign it with your Apple ID
(free personal team is enough for installing on your own phone), and run it
to your connected device.

## Notes
- All 8,226 cards and your review schedule live entirely on your phone —
  the app works fully offline once installed.
- "New cards per day" is adjustable in the app (default 150) so new material
  doesn't dump on you all at once.
- To wipe progress and start over, use "Reset all scheduling data" in the app.
- The question text is extracted directly from your uploaded PDF — spot-check
  against the source for anything you plan to rely on heavily.

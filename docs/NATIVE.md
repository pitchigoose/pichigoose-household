# The iPhone app

Pichigoose as a real iPhone app, made with Capacitor (2 Nov 2026). It's the same app as pichigoose.com, inside a native shell.

## How it works while we test

- **The app opens pichigoose.com itself.** Every fix that goes live reaches your phone the next time you open the app. No cable, no reinstall.
- **You only rebuild in Xcode when the native part changes:** the icon, the launch screen, the keyboard handling, or a new plugin. Claude will tell you when that's needed.
- **The keyboard is native now.** iPhone tells the app the keyboard's exact height just before it slides in, so the bars move together with it, and the page never gets pushed up.
- **You'll sign in once inside the app.** It keeps its own login, separate from Safari.

Before the App Store, the app switches to carrying its own copy of Pichigoose, so it also works offline from the very first launch.

## First install, on your Mac (one time, about 15 minutes)

You need: your Mac with Xcode, your iPhone, and its cable.

1. **Node.js:** download and install the "LTS" version from nodejs.org, if it isn't on your Mac yet.
2. **Get the code.** Open Terminal and paste these one at a time:
   ```
   git clone https://github.com/muococoa/pichigoose-household.git
   cd pichigoose-household
   npm install
   npx cap open ios
   ```
   Xcode opens with the Pichigoose project.
3. **Sign it with your Apple ID.** In Xcode, click **App** at the top of the left column, then the **Signing & Capabilities** tab. Under **Team**, choose **Add an Account…**, sign in with your Apple ID, and pick it.
   - If Xcode says the bundle identifier is taken, change `com.pichigoose.app` to something like `com.pichigoose.nora`.
4. **Your iPhone.** Plug it in and unlock it. On the iPhone, turn on **Settings → Privacy & Security → Developer Mode** (it restarts once).
5. **Run it.** At the top of Xcode, pick your iPhone from the device list, then press the **▶** button. The first build takes a few minutes.
6. **Trust it, the first time only.** On the iPhone, go to **Settings → General → VPN & Device Management**, tap your Apple ID, and tap **Trust**. Then open Pichigoose from the home screen.

## Later

- **A web fix went live:** close the app completely (swipe it away) and open it again.
- **Claude says the native part changed:** in Terminal, inside the `pichigoose-household` folder:
  ```
  git pull
  npm install
  npx cap sync ios
  npx cap open ios
  ```
  Then press **▶** in Xcode again.
- **With a free Apple ID**, an app you install yourself stops opening after 7 days; just press ▶ in Xcode again. The paid developer account ($99 a year) removes that limit and unlocks TestFlight for family and friends.

## What's in the code

- `capacitor.config.ts`: the app's name and id, the website it opens, and the keyboard and status bar settings.
- `ios/`: the Xcode project (made by Capacitor; the app icon and launch screen are in `ios/App/App/Assets.xcassets`).
- `src/lib/keyboard.ts`: in the app it uses the native keyboard events; in Safari it keeps the old way.

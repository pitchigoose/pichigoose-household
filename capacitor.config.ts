import type { CapacitorConfig } from '@capacitor/cli'

// The iPhone app (Nora, 2 Nov): the same Pichigoose, wrapped as a real iPhone app with Capacitor.
// While we test, the app opens pichigoose.com itself, so every fix that goes live reaches the phone the next time
// the app opens, with no reinstall. Only changes to the native part (this file, plugins, the icon) need Xcode again.
// Before the App Store we switch to the built-in copy (webDir) so it also works fully offline from the first launch.
const config: CapacitorConfig = {
  appId: 'com.pichigoose.app',
  appName: 'Pichigoose',
  webDir: 'dist',
  server: {
    url: 'https://www.pichigoose.com',
    allowNavigation: ['www.pichigoose.com', 'pichigoose.com', '*.supabase.co'],
  },
  ios: {
    // The app draws its own paper behind the status bar and home bar (safe areas), like in Safari.
    contentInset: 'never',
    backgroundColor: '#EFD3D8',
  },
  plugins: {
    // The keyboard slides over the app; the app moves its own bars by exactly its height (src/lib/keyboard.ts).
    Keyboard: { resize: 'none', style: 'light', resizeOnFullScreen: false },
    StatusBar: { style: 'LIGHT', overlaysWebView: true },
  },
}

export default config

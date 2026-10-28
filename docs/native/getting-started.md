# Getting started

A plugin is an ordinary Android APK that adds apps to Halone. Each app opens in
a window on the glasses, drawn by the plugin in its own process straight into
a `Surface` the shell owns: no WebView, no copy. The shell sends the wearer's
input back as `MotionEvent`s and `KeyEvent`s.

This guide builds a plugin with one app. The
[`plugin-sample`](https://github.com/HaloneXR/halone-examples/tree/main/plugin-sample)
in halone-examples is a complete one, with an app drawn with a Canvas and an
app made of Android views.

## What you need

- An Android project, built with JDK 17. The SDK's `minSdk` is 29.
- Halone on the phone, and `adb` to install the APK. The glasses take the USB-C
  port, so connect adb over Wi-Fi.

## Add the library

The library is `dev.halone:plugin-sdk` on Maven Central. Make sure
`mavenCentral()` is among your repositories:

```kotlin [settings.gradle.kts]
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
    }
}
```

```kotlin [app/build.gradle.kts]
dependencies {
    implementation("dev.halone:plugin-sdk:0.2.0")
}
```

Or with a version catalog, as the sample does:

```toml [gradle/libs.versions.toml]
[versions]
haloneSdk = "0.2.0"

[libraries]
halone-plugin-sdk = { group = "dev.halone", name = "plugin-sdk", version.ref = "haloneSdk" }
```

```kotlin
dependencies {
    implementation(libs.halone.plugin.sdk)
}
```

## Declare the service

The shell finds plugins by a service with the intent action
`dev.halone.action.PANEL_PROVIDER`. Add it to `AndroidManifest.xml`:

```xml
<application
    android:icon="@drawable/ic_plugin"
    android:label="My plugin">

    <service
        android:name=".MyProvider"
        android:exported="true"
        android:label="My plugin"
        android:permission="dev.halone.permission.BIND_PANEL_PROVIDER">
        <intent-filter>
            <action android:name="dev.halone.action.PANEL_PROVIDER" />
        </intent-filter>
        <meta-data android:name="dev.halone.plugin.CONTRACT" android:value="2" />
    </service>
</application>
```

- **The permission** is defined by the shell at signature level, so only the
  shell can bind the service. The shell refuses a plugin whose service does not
  require it.
- **The contract** is the version of the AIDL the plugin was built against,
  `PluginContract.VERSION`, which is 2 in SDK 0.2.0. A plugin built for
  contract 2 needs a Halone that knows it, and shows as incompatible in an
  older one; one built for contract 1 keeps working, without
  [settings or the environment's start and stop](./recipes/settings).
- The application's icon is used for the plugin's apps unless they name their
  own.

## Write the provider

The provider lists the plugin's apps and opens a session, one window, for each
app the wearer launches:

```kotlin
package com.example.myplugin

import android.os.Bundle
import dev.halone.plugin.PanelProviderService
import dev.halone.plugin.PanelSession
import dev.halone.plugin.PluginApp

class MyProvider : PanelProviderService() {
    override fun apps() = listOf(
        PluginApp("hello", "Hello", "A first plugin app", widthPx = 600, heightPx = 400),
    )

    override fun createSession(appId: String, args: Bundle): PanelSession? = when (appId) {
        "hello" -> HelloSession()
        else -> null
    }
}
```

`apps()` and `createSession` run on the main thread. An app's `id` is the
plugin's own name for it: keep it stable across versions, since the wearer pins
apps by it.

## Write a session

The simplest session shows Android views. A `ViewPanelSession` returns a `View`
from `onCreateView`, and taps, scrolls and keys reach it as on a phone screen:

```kotlin
package com.example.myplugin

import android.content.Context
import android.graphics.Color
import android.view.Gravity
import android.view.View
import android.widget.TextView
import dev.halone.plugin.ViewPanelSession

class HelloSession : ViewPanelSession() {
    override fun onCreateView(context: Context): View {
        host.setTitle("Hello")
        return TextView(context).apply {
            text = "Hello from a plugin"
            textSize = 32f
            gravity = Gravity.CENTER
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.rgb(0x16, 0x18, 0x1d))
        }
    }
}
```

Windows are laid out at 160 dpi, so one dp is one window pixel, as one CSS
pixel is in a web app. `host` is the window: see
[`PanelHost`](./reference#panelhost).

## Install and enable it

```sh
./gradlew :app:installDebug
```

A newly installed plugin is off. In Halone, open **Settings → Plugins** and
turn it on. Its apps then appear in the launcher.

The shell remembers the plugin's signing certificate when it is enabled, and
refuses the plugin if that changes, as it would when a build signed with
another key replaces it.

With developer mode on, adb can list plugins and turn one on, which saves a
trip to Settings while iterating:

```sh
adb shell am broadcast -a dev.halone.DEV -p dev.halone.app --es command plugins
adb shell am broadcast -a dev.halone.DEV -p dev.halone.app --es command plugin --es package com.example.myplugin --ez enabled true
```

## Next

- [Plugins and sessions](./concepts): the lifecycle, input, and the two kinds
  of session
- [Drawing with a Canvas](./recipes/canvas) and [Android views](./recipes/views)
- [Settings and the environment](./recipes/settings): a page in Settings, and
  work done only while the glasses are worn
- [The API reference](./reference)

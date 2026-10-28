# Settings and the environment

From contract 2 (SDK 0.2.0), a plugin can have its own page in Settings, and
hears when the environment starts and stops on the glasses. Both need a
Halone that knows contract 2; see [Declare the service](../getting-started#declare-the-service).

## Declaring settings

List the settings in a raw JSON resource, such as
`res/raw/halone_settings.json`:

```json [res/raw/halone_settings.json]
[
  {
    "key": "refresh",
    "type": "boolean",
    "default": true,
    "label": "Refresh while worn",
    "help": "Fetches new headlines while the environment runs."
  },
  {
    "key": "intervalMinutes",
    "type": "number",
    "default": 15,
    "min": 5,
    "max": 120,
    "step": 5,
    "unit": "min",
    "label": "Every",
    "help": "How often to fetch."
  },
  {
    "key": "order",
    "type": "enum",
    "default": "newest",
    "values": ["newest", "source"],
    "labels": { "newest": "Newest first", "source": "By source" },
    "label": "Order"
  }
]
```

and point the service's meta-data at it, beside the contract:

```xml
<meta-data android:name="dev.halone.plugin.CONTRACT" android:value="2" />
<meta-data android:name="dev.halone.plugin.SETTINGS" android:resource="@raw/halone_settings" />
```

A cog then appears beside the plugin under **Settings → Plugins**, and opens
its page. Each entry has a `key`, a `type`, a `default` and a `label`; `help`
is optional.

| `type` | Shown as | Also takes | The value |
|---|---|---|---|
| `boolean` | A toggle | | `Boolean` |
| `number` | A slider | `min` and `max` (required), `step`, `unit` | `Double` |
| `enum` | A choice | `values` (required), `labels` by value; a value without a label shows as itself | `String` |

Keys are letters, digits, `.`, `_` and `-`, up to 64, and a list has at most
32 settings. A list the shell cannot use, such as one with an unknown type or a
default outside its range, gets no page at all, so check that the cog appears.

## Reading them

The shell keeps the values and checks them against the list, so the wearer can
change them on the phone while the environment is off. `settings` holds the
latest, under each key, defaults included. `onSettingsChanged` runs on the main
thread when the shell connects, and after every change:

```kotlin
override fun onSettingsChanged(settings: Bundle) {
    val order = settings.getString("order")
    ...
}
```

`settings` is empty until the shell connects, so read it from
`onSettingsChanged` rather than from `onCreate`.

## The environment

`onEnvironmentStarted` and `onEnvironmentStopped` run on the main thread when
the environment starts and stops on the glasses, and `environmentRunning` says
which was last. A plugin uses them to do something only while the glasses are
worn, and to put the phone back as it was afterwards.

`onEnvironmentStopped` also runs when the shell goes away without saying so,
as when Halone is killed, so whatever `onEnvironmentStarted` changed is always
undone there.

## Together

A provider that fetches headlines on a timer, only while the environment runs
and the setting is on. Its `apps()` and `createSession()` are left out here:

```kotlin
class NewsProvider : PanelProviderService() {
    private val main = Handler(Looper.getMainLooper())
    private val refresh = object : Runnable {
        override fun run() {
            fetchHeadlines(settings.getString("order") ?: "newest")
            main.postDelayed(this, (settings.getDouble("intervalMinutes") * 60_000).toLong())
        }
    }

    override fun onSettingsChanged(settings: Bundle) = schedule()

    override fun onEnvironmentStarted() = schedule()

    override fun onEnvironmentStopped() = schedule()

    private fun schedule() {
        main.removeCallbacks(refresh)
        if (environmentRunning && settings.getBoolean("refresh")) main.post(refresh)
    }
}
```

Every callback funnels into one function that works out what should be
happening from `environmentRunning` and `settings`, so the order they arrive
in does not matter.

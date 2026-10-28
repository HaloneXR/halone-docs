# Plugins and sessions

## The provider

A plugin has one `PanelProviderService`, which the shell binds while the plugin
is enabled. It answers three questions:

- **`apps()`**: the apps to show in the launcher, now. Call `appsChanged()`
  when the answer changes.
- **`createSession(appId, args)`**: a new window of an app, or `null` to
  refuse it. `args` are what `openPanel` passed, or empty from the launcher.
- **`appIcon(appId, sizePx)`**: an app's icon. By default it draws
  `PluginApp.icon` (a drawable resource), or the APK's own icon; override it
  to draw icons some other way. It runs on a binder thread.

The provider can also open windows itself:

- `launchApp(appId, args)` opens an app as the launcher does, focusing its
  window if it has one.
- `openPanel(appId, args)` always opens another window.

Both work for hidden apps (`PluginApp(hidden = true)`), which is how a plugin
with hundreds of entries keeps most of them out of the launcher. The list is
sent without icons, and an icon is fetched only when something shows it;
`iconVersion` tells the shell when to fetch it again.

Halone binds the provider while the environment runs, and lets go of it
when the environment stops. `onEnvironmentStarted` and `onEnvironmentStopped`
mark that span; the service itself can outlive it, if Android keeps it or the
plugin's own activities start it. `settings` holds the wearer's values for the
settings the plugin declares; see
[Settings and the environment](./recipes/settings).

## Sessions

A session is one window. There are two kinds:

| | `ViewPanelSession` (View mode) | `PanelSession` (Surface mode) |
|---|---|---|
| You provide | A `View` from `onCreateView` | Pixels drawn into the `Surface` from `onAttach` |
| Drawing | Android draws the views on a private virtual display in your process, hardware accelerated | A `Canvas`, GL or a `MediaCodec`, until `onDetach` or `onClose` |
| Input | Taps, drags, scrolls, the wheel, hover and physical keys reach the views as on a phone screen | `onMotionEvent`, `onKeyEvent` and `onContextMenu` are yours to handle |
| Context menu | Long-presses the view under the point | `onContextMenu(x, y)` |
| Phone keyboard | Comes up for a focused text field by itself | `host.showKeyboard`, and apply `onTextInput` edits |

Every callback runs on the main thread.

### Lifecycle

A session goes:

1. `onAttach(surface)`: start drawing. `widthPx`, `heightPx` and `densityDpi`
   are set.
2. Any number of `onResize()` calls, when the size changed (the surface's
   buffers already have the new size), and `onDetach()` / `onAttach(surface)`
   pairs: on `onDetach` the window is hidden and the surface goes. Keep your
   state, since a new surface may follow.
3. `onClose()`: the window closed. Release everything.

A session is never reused. If the plugin's process dies, its windows show
"stopped, tap to open it again", and a tap opens a new session.

`ViewPanelSession` handles all of this for its views: hiding the window keeps
them, and a resize lays them out again without rebuilding them.

### The window

`host`, a [`PanelHost`](./reference#panelhost), is the session's window. Its
calls have the meanings of `halone.windows` in a web app:

```kotlin
host.setTitle("Inbox")
host.requestResize(1200, 800)
host.setSizeLimits(400, 300, 1600, 1200)
host.setPinned(true)
host.focus()
host.close()
```

`requestResize` asks for a size, which the shell keeps within the window's
limits; `onResize` follows. A pinned window stays where it is in the room
instead of following the wearer. `focus` brings the window to the front and
turns the wearer's view to it, as a click in the dock does.

`host.setBackButton(true)` puts a Back button in the title bar, after the grip;
pressing it calls `onBack()`. The shell takes it away when the plugin stops, so
set it again in a new session.

Calls on `host` never block, and do nothing once the shell is gone.

## Input

`onMotionEvent` gets, in window pixels:

- touches, for taps, drags and scrolls
- mouse events: hover (`ACTION_HOVER_MOVE`, and `ACTION_HOVER_EXIT` when the
  pointer leaves), the wheel (`ACTION_SCROLL`), and the middle button
  (`ACTION_BUTTON_PRESS` with `BUTTON_TERTIARY` held, then
  `ACTION_BUTTON_RELEASE`)

Hover comes from every pointer: the phone's gyro and touchpad, and gaze, as
well as a mouse. The event is recycled after the callback returns, so copy
what you need.

`onKeyEvent` gets keys from a physical keyboard while the window has focus.
`onContextMenu(x, y)` is the wearer asking for a context menu: a right click,
a two-finger tap or a still hold.

## Trust

A newly installed plugin is off until the wearer turns it on in
**Settings → Plugins**. The shell then remembers its signing certificate and
refuses it if that changes. A plugin built against a newer contract than the
shell knows shows as incompatible. While enabled, the plugin stays bound with
the shell's priority.

Only the shell can call into a plugin: the service requires
`dev.halone.permission.BIND_PANEL_PROVIDER`, a signature permission the shell
defines, and `PanelProviderService` checks it on every call.

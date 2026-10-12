# API reference: dev.halone.plugin

`dev.halone:plugin-sdk:0.1.0`, package `dev.halone.plugin`. The sources are in
[halone-sdk](https://github.com/HaloneXR/halone-sdk/tree/main/android/plugin-sdk).

```kotlin
implementation("dev.halone:plugin-sdk:0.1.0")
```

## PanelProviderService

```kotlin
abstract class PanelProviderService : Service()
```

A plugin: the service the shell binds to list its apps and open their
windows. Declare it in the manifest with the intent action
`PluginContract.ACTION_PANEL_PROVIDER`, the permission
`PluginContract.PERMISSION_BIND` and the meta-data
`PluginContract.META_CONTRACT`; see [Getting started](./getting-started#declare-the-service).
Only the shell may call it: every call is checked against the permission.

| Member | |
|---|---|
| `abstract fun apps(): List<PluginApp>` | The apps to show in the launcher, now. Main thread. |
| `abstract fun createSession(appId: String, args: Bundle): PanelSession?` | A new window of app `appId`. `args` are what `openPanel` or `launchApp` passed, or empty from the launcher. Return `null` to refuse it. Main thread. |
| `open fun appIcon(appId: String, sizePx: Int): Bitmap?` | App `appId`'s icon, `sizePx` square (clamped to 16–512). By default draws `PluginApp.icon`, or the APK's icon when it is 0. Runs on a binder thread. |
| `fun appsChanged()` | Tells the shell to list the apps again. |
| `fun openPanel(appId: String, args: Bundle = Bundle())` | Asks the shell for a new window of app `appId`, which `createSession` then opens with `args`. |
| `fun launchApp(appId: String, args: Bundle = Bundle())` | Opens app `appId` as the launcher does: brings its window to the front if it has one, otherwise opens one with `args`. Hidden apps open too. |
| `fun setStatusItem(item: StatusItem)` | Shows `item` in the dock, or replaces the one with its id. Kept while the plugin runs; set before the shell connects, it appears once it does. Main thread. |
| `fun removeStatusItem(id: String)` | Removes a status item. |
| `open fun onStatusItemClicked(id: String)` | The wearer clicked status item `id`. Main thread. |

`onBind` is final. On unbind and on destroy, every open session is closed.

## PluginApp

```kotlin
data class PluginApp(
    val id: String,
    val name: String,
    val description: String = "",
    val widthPx: Int = 1024,
    val heightPx: Int = 768,
    val icon: Int = 0,
    val hidden: Boolean = false,
    val iconVersion: String? = null,
    val color: Int? = null,
)
```

One app a plugin offers in the launcher.

| Property | |
|---|---|
| `id` | The plugin's own name for the app. Keep it stable across versions, since the wearer pins apps by it. |
| `name`, `description` | Shown in the launcher. |
| `widthPx`, `heightPx` | The window's size when it opens, in window pixels (dp). |
| `icon` | A drawable resource of the plugin's, or 0 for the plugin's own icon. |
| `hidden` | Listed for opening by the shell or the plugin, not shown in the launcher. |
| `iconVersion` | Changes whenever the icon does, so the shell fetches it again. `null` means the plugin's version code. |
| `color` | The launcher tile's colour, as an opaque `0xFFRRGGBB`. `null` leaves it to the launcher. |

## PanelSession

```kotlin
abstract class PanelSession
```

One open window of a plugin app, in Surface mode: the plugin draws into the
`Surface` it is given however it likes (a `Canvas`, GL, a `MediaCodec`) and
hears the wearer's input. Every callback runs on the main thread. A session
goes attach, then any number of resizes and detach/attach pairs, then close; it
is never reused.

| Property | |
|---|---|
| `context: Context` | The plugin's service. |
| `host: PanelHost` | The window. |
| `widthPx: Int`, `heightPx: Int` | The window's size. Set before `onAttach` and `onResize`. |
| `densityDpi: Int` | The density the window is laid out at: `PluginContract.DENSITY_DPI`, 160. |

| Callback | |
|---|---|
| `open fun onAttach(surface: Surface)` | Start drawing into `surface`, which stays valid until `onDetach` or `onClose`. |
| `open fun onResize()` | `widthPx` and `heightPx` changed; the surface's buffers already have the new size. |
| `open fun onDetach()` | Stop drawing: the window is hidden, and the surface goes. Keep the state; `onAttach` may follow with a new one. |
| `open fun onClose()` | The window closed. Release everything. |
| `open fun onMotionEvent(event: MotionEvent)` | A touch (tap, drag, scroll) or a mouse event (hover and its exit, wheel, the middle button as `ACTION_BUTTON_PRESS` with `BUTTON_TERTIARY` held, then `ACTION_BUTTON_RELEASE`) in window pixels. Recycled after this returns. |
| `open fun onKeyEvent(event: KeyEvent)` | A key from a physical keyboard while the window has it. |
| `open fun onContextMenu(x: Float, y: Float)` | The wearer asked for a context menu at window pixel (`x`, `y`): a right click, a two-finger tap, a still hold. |
| `open fun onBack()` | The title bar's Back button was pressed, while `PanelHost.setBackButton` shows it. |
| `open fun onTextInput(event: TextInputEvent)` | An edit from the phone's keyboard, while `PanelHost.showKeyboard` has it up. |

## ViewPanelSession

```kotlin
abstract class ViewPanelSession : PanelSession()
```

A session in View mode: `onCreateView`'s views, laid out at the window's size
and drawn into its surface, with taps, scrolls, the wheel, hover and keys
delivered to them as on a phone screen. A text field that takes focus brings
up the phone's keyboard, which types into it through the field's own
`InputConnection`. The views live on a private virtual display in the plugin's
process, in a `Presentation`, which keeps them hardware accelerated. Hiding the
window keeps them.

| Member | |
|---|---|
| `abstract fun onCreateView(context: Context): View` | The content, built once, with a context carrying the window's display and `themeResId`. |
| `open val themeResId: Int` | The theme the views are inflated with; `android.R.style.Theme_DeviceDefault_NoActionBar` by default. |
| `val view: View?` | The content, once built. |

It overrides `onAttach`, `onResize`, `onDetach`, `onClose`, `onMotionEvent`,
`onKeyEvent`, `onTextInput` and `onContextMenu`; call `super` if you override
them too. A context menu request long-presses the innermost view under the
point that takes one, or opens its context menu.

## PanelHost

```kotlin
class PanelHost
```

The window a session is shown in, as `halone.windows` gives it to a web app.
Calls never block; once the shell is gone they do nothing.

| Method | |
|---|---|
| `setTitle(title: String)` | |
| `close()` | Closes the window, which closes the session. |
| `focus()` | Brings the window to the front and turns the wearer's view to it, as a click in the dock does. |
| `setBackButton(visible: Boolean)` | Shows or hides a Back button in the title bar; pressing it calls `PanelSession.onBack`. |
| `setPinned(pinned: Boolean)` | Pinned windows stay where they are in the room instead of following the wearer. |
| `requestResize(widthPx: Int, heightPx: Int)` | Asks for a new size, which the shell keeps within the window's limits; `onResize` follows. |
| `setSizeLimits(minWidthPx: Int, minHeightPx: Int, maxWidthPx: Int, maxHeightPx: Int)` | |
| `showKeyboard(request: KeyboardRequest)` | Brings up the phone's keyboard for a field of this window; what it types arrives in `onTextInput`. Nothing comes up while a physical keyboard is connected. |
| `hideKeyboard()` | |
| `updateKeyboard(state: KeyboardState)` | Tells the keyboard what the field holds now, after a change it did not make: a tap moving the cursor, a key. |

## KeyboardRequest

```kotlin
data class KeyboardRequest(
    val inputType: Int = InputType.TYPE_CLASS_TEXT,
    val imeOptions: Int = EditorInfo.IME_ACTION_DONE,
    val hint: String = "",
    val state: KeyboardState = KeyboardState(),
)
```

What the phone's keyboard is about to type into: the field's kind and action
as an `EditorInfo` gives them, and what it holds.

## KeyboardState

```kotlin
data class KeyboardState(
    val text: String = "",
    val selectionStart: Int = text.length,
    val selectionEnd: Int = selectionStart,
)
```

The field's text and selection, as the plugin has them. The keyboard keeps a
copy to offer suggestions and corrections from; `PanelHost.updateKeyboard` puts
it right whenever the field changes other than by the keyboard.

## TextInputEvent

```kotlin
sealed class TextInputEvent
```

One edit from the phone's keyboard, as its `InputConnection` made it. Keys it
sends as keys (delete, enter on some keyboards) arrive as key events. Positions
are in UTF-16 units of the field's text.

| Subclass | |
|---|---|
| `Commit(text: String, newCursorPosition: Int)` | Replaces the composing text, or the selection, with `text`; see `InputConnection.commitText`. |
| `Compose(text: String, newCursorPosition: Int)` | Replaces the composing text, or the selection, with `text` and keeps it composing. |
| `ComposingRegion(start: Int, end: Int)` | Marks the existing text from `start` to `end` as composing. |
| `FinishComposing` | The composing text stays as it is. |
| `DeleteSurrounding(before: Int, after: Int)` | Deletes `before` units before the selection and `after` after it. |
| `Select(start: Int, end: Int)` | Sets the selection. |
| `EditorAction(actionId: Int)` | The keyboard's action key: an `EditorInfo.IME_ACTION_*`. |
| `Dismissed` | The wearer put the keyboard away. |

An event of a kind this version of the SDK does not know is dropped.

## StatusItem

```kotlin
data class StatusItem(
    val id: String,
    val icon: Bitmap,
    val label: String = "",
    val text: String = "",
    val tinted: Boolean = true,
)
```

An item in the dock's status area, beside the clock and the battery; see
[Status items in the dock](./recipes/status-items).

| Property | |
|---|---|
| `id` | The plugin's own name for it; setting the same id again replaces it. |
| `icon` | Drawn about 28 px tall; scaled down to `MAX_ICON_PX` (96) if larger. |
| `label` | What hovering it says. |
| `text` | A few characters beside the icon, such as `5G`. |
| `tinted` | Drawn in the dock's text colour from the icon's alpha, like the battery; `false` keeps its own colours. |

## PluginContract

```kotlin
object PluginContract
```

What a plugin and the shell agree on outside the AIDL.

| Constant | Value | |
|---|---|---|
| `VERSION` | `1` | Raised whenever a method is added to the AIDL; the shell binds plugins from 1 up to its own. |
| `ACTION_PANEL_PROVIDER` | `"dev.halone.action.PANEL_PROVIDER"` | The intent action of a plugin's `PanelProviderService`. |
| `PERMISSION_BIND` | `"dev.halone.permission.BIND_PANEL_PROVIDER"` | Defined by the shell, signature-level; a plugin's service must require it. |
| `META_CONTRACT` | `"dev.halone.plugin.CONTRACT"` | Service meta-data: the contract version the plugin was built against. |
| `DENSITY_DPI` | `160` | Windows are laid out at this density, so one dp is one window pixel. |

It also holds the `Bundle` keys of an app's description and a status item
(`KEY_*`), which the SDK fills in for you.

## The AIDL

The SDK implements these for you; they are listed for reference. Methods are
only ever added, under new transaction codes, never changed.

```java
interface IPanelProvider {
    int contractVersion() = 0;
    void setHost(IProviderHost host) = 1;
    List<Bundle> listApps() = 2;
    byte[] appIcon(String appId, int sizePx) = 3;
    IPanel open(String appId, in Bundle args, IPanelHost host) = 4;
    oneway void statusItemClicked(String id) = 5;
}

interface IProviderHost {
    oneway void appsChanged() = 0;
    oneway void openPanel(String appId, in Bundle args) = 1;
    oneway void setStatusItem(String id, in Bundle item) = 2;
    oneway void removeStatusItem(String id) = 3;
    oneway void launchApp(String appId, in Bundle args) = 4;
}

interface IPanel {
    oneway void attach(in Surface surface, int widthPx, int heightPx, int densityDpi) = 0;
    oneway void resize(int widthPx, int heightPx, int densityDpi) = 1;
    oneway void detach() = 2;
    oneway void close() = 3;
    oneway void dispatchMotion(in MotionEvent event) = 4;
    oneway void dispatchKey(in KeyEvent event) = 5;
    oneway void contextMenu(float x, float y) = 6;
    oneway void dispatchTextInput(in Bundle event) = 7;
    oneway void back() = 8;
}

interface IPanelHost {
    oneway void setTitle(String title) = 0;
    oneway void close() = 1;
    oneway void setPinned(boolean pinned) = 2;
    oneway void requestResize(int widthPx, int heightPx) = 3;
    oneway void setSizeLimits(int minWidthPx, int minHeightPx, int maxWidthPx, int maxHeightPx) = 4;
    oneway void showKeyboard(in Bundle request) = 5;
    oneway void hideKeyboard() = 6;
    oneway void updateKeyboard(in Bundle state) = 7;
    oneway void focus() = 8;
    oneway void setBackButton(boolean visible) = 9;
}
```

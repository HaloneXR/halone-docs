# The halone client

```ts
import { useHalone } from '@halone/sdk'

const halone = useHalone()
```

`useHalone()` returns one client per page. Every method returns a promise, and
rejects with a [`HaloneError`](./reference/classes/HaloneError) on failure.
This page lists what a third-party app can call, and the permission each call
needs; the [generated reference](./reference/) has every type.

## Members

| Member | |
|---|---|
| `ready` | Resolves once the shell has connected. |
| `connection` | The underlying [`Connection`](./reference/classes/Connection), as a promise. |
| `on(name, listener)` | Subscribes to an event; returns a function that unsubscribes. |

## Methods for apps

| Method | Permission | Answers with |
|---|---|---|
| `system.info()` | | [`SystemInfo`](./reference/interfaces/SystemInfo): platform (`simulator` or `android`), Halone's version, protocol version, the glasses' name, field of view and resolution |
| `system.ping()` | | The round trip to the shell, in milliseconds |
| `system.battery()` | | [`Battery`](./reference/interfaces/Battery): `level` from 0 to 1, `charging` |
| `windows.self()` | | [`WindowInfo`](./reference/interfaces/WindowInfo) of the caller |
| `windows.setTitle(title)` | | |
| `windows.resize(widthPx, heightPx, anchor?)` | | The size it got |
| `windows.setSizeLimits(limits \| null)` | | |
| `windows.setStereoRegion(region \| null)` | | |
| `windows.setAutoHide(enabled)` | | |
| `windows.setPinned(pinned)` | | Own window only |
| `windows.close()` | | Own window only |
| `windows.openedFile()` | | `{ path }`: the file the window was last asked to open |
| `windows.route()` | | `{ route }`: where `apps.launch` last asked the window to go |
| `windows.openUrl(url)` | | [`WindowInfo`](./reference/interfaces/WindowInfo) |
| `windows.list()` | `windows` | Every [`WindowInfo`](./reference/interfaces/WindowInfo) |
| `windows.focus(id)` | `windows` | |
| `browser.open(url, private?)` | | The web window's [`WindowInfo`](./reference/interfaces/WindowInfo) |
| `menu.show(items, xPx, yPx)` | | The chosen item's id, or `null` |
| `clipboard.writeText(text)` | | |
| `clipboard.read()` | `clipboard` | [`ClipboardContent`](./reference/interfaces/ClipboardContent) |
| `clipboard.writeFiles({ paths, cut })` | `files` | |
| `files.access()` | `files` | `{ granted }` |
| `files.roots()` | `files` | [`FileRoot`](./reference/interfaces/FileRoot)`[]` |
| `files.list(path)` | `files` | [`FileEntry`](./reference/interfaces/FileEntry)`[]` |
| `files.stat(path)` | `files` | [`FileEntry`](./reference/interfaces/FileEntry) |
| `files.copy(paths, to)` | `files` | The new entries |
| `files.move(paths, to)` | `files` | The new entries |
| `files.rename(path, name)` | `files` | The new entry |
| `files.delete(paths)` | `files` | |
| `files.createDirectory(parent, name)` | `files` | The new entry |
| `apps.open(path, appId?)` | `files` | The window it opened in |
| `apps.list(includeHidden?)` | `apps` | [`AppInfo`](./reference/interfaces/AppInfo)`[]` |
| `apps.launch(appId, route?)` | `apps` | The app's window |
| `media.open(path, layout, startSeconds?)` | `files` | [`MediaState`](./reference/interfaces/MediaState) |
| `media.state()` | | [`MediaState`](./reference/interfaces/MediaState) |
| `media.play()`, `pause()`, `seek(seconds)` | | |
| `media.setLayout(layout)`, `recenter()`, `setRotatable(rotatable)`, `close()` | | |
| `sockets.connect(host, port, options?)` | `network.tcp` | A [`TcpSocket`](./reference/classes/TcpSocket) |
| `screen.capture(delayMs?)` | `screen` | Saves what the left eye sees to the gallery |
| `screen.recording()` | `screen` | [`RecordingState`](./reference/interfaces/RecordingState) |
| `screen.startRecording(delayMs?)`, `stopRecording()` | `screen` | |
| `scene.recenter()` | | |
| `scene.headPose()` | `sensors` | [`HeadPose`](./reference/interfaces/HeadPose) |

The client also has `browser` (tabs and navigation), `history`, `bookmarks`,
`downloads`, `launcher`, `plugins`, `status`, `input`, `settings`,
`apps.uninstall`, `files.requestAccess` and the menu overlay's
`menu.current`, `rendered` and `choose`. Those are for Halone's own apps, and
fail with `permission-denied` in any other.

## Events for apps

| Event | Permission | Data |
|---|---|---|
| `window.focusChanged` | | `{ focused }` |
| `window.fileOpened` | | `{ path }` |
| `window.routed` | | `{ route }` |
| `system.batteryChanged` | | [`Battery`](./reference/interfaces/Battery) |
| `media.changed` | | [`MediaState`](./reference/interfaces/MediaState), to the window that owns the player |
| `socket.data`, `socket.closed` | | Handled by [`TcpSocket`](./reference/classes/TcpSocket) |
| `windows.changed` | `windows` | [`WindowInfo`](./reference/interfaces/WindowInfo)`[]` |
| `apps.changed` | `apps` | `null`; call `apps.list()` |
| `files.accessChanged` | `files` | `{ granted }` |
| `screen.recordingChanged` | `screen` | [`RecordingState`](./reference/interfaces/RecordingState) |

## Other exports

| Export | |
|---|---|
| [`connect`](./reference/functions/connect), [`createClient`](./reference/functions/createClient) | What `useHalone()` is built from; see [How the bridge works](./bridge). |
| [`HaloneError`](./reference/classes/HaloneError) | The error every call rejects with; has a `code`. |
| [`TcpSocket`](./reference/classes/TcpSocket) | A TCP connection; see [TCP sockets](./recipes/sockets). |
| [`parentPath`](./reference/functions/parentPath), [`baseName`](./reference/functions/baseName), [`mimeTypeOf`](./reference/functions/mimeTypeOf), [`mimeMatches`](./reference/functions/mimeMatches), [`isImage`](./reference/functions/isImage), [`isVideo`](./reference/functions/isVideo) | Path and type helpers; see [Files](./recipes/files). |
| [`layoutFromName`](./reference/functions/layoutFromName), [`eyeAspect`](./reference/functions/eyeAspect), [`fitBox`](./reference/functions/fitBox), [`splitMpo`](./reference/functions/splitMpo) | Stereo helpers; see [Stereo and 360° video](./recipes/media) and [Stereo pictures](./recipes/window#stereo-pictures). |
| [`Methods`](./reference/interfaces/Methods), [`Events`](./reference/interfaces/Events) | The protocol: every method's parameters and result, and every event's data. |
| [`PackageManifest`](./reference/interfaces/PackageManifest), [`Permission`](./reference/type-aliases/Permission) | `halone.json` and its permissions. |
| `@halone/sdk/package` | `checkManifest`, for tooling; see [The manifest](./manifest). |

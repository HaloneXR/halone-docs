# Permissions

An app asks for permissions in its [manifest](./manifest), and the wearer
grants them when installing it. A dev app run with `halone dev` gets its
manifest's permissions without a prompt.

A call the app was not granted fails with a `HaloneError` whose `code` is
`permission-denied` and whose message names the permission it needs. A call
that no third-party app may make fails the same way, saying it is not
available to apps.

```ts
import { HaloneError, useHalone } from '@halone/sdk'

const halone = useHalone()

try {
  await halone.windows.list()
} catch (error) {
  if (error instanceof HaloneError && error.code === 'permission-denied') {
    console.warn(error.message)
  }
}
```

## Without asking

Every app may, with no permission:

- know about the system: `system.info`, `system.ping`, `system.battery`
- manage its own window: `windows.self`, `setTitle`, `resize`,
  `setSizeLimits`, `setStereoRegion`, `setAutoHide`, `openedFile`, `route`,
  and `close` and `setPinned` for itself only
- open a URL: `windows.openUrl`, and `browser.open` in the browser
- show menus over itself: `menu.show`
- write text to the clipboard: `clipboard.writeText`
- recenter the view: `scene.recenter`
- drive the immersive video player it opened: `media.state`, `play`, `pause`,
  `seek`, `setLayout`, `recenter`, `setRotatable`, `close`

It also hears the events about itself: `window.focusChanged`,
`window.fileOpened`, `window.routed`, `media.changed`,
`system.batteryChanged`, `socket.data` and `socket.closed`.

## The permissions

| Permission | Grants | The prompt says |
|---|---|---|
| `network.tcp` | `sockets.*`: TCP connections, with TLS | Connect to any device or server |
| `network.udp` | Reserved; nothing uses it yet | Send and receive network packets |
| `clipboard` | `clipboard.read` | Read what you copy |
| `files` | `files.access`, `roots`, `list`, `stat`, `copy`, `move`, `rename`, `delete`, `createDirectory`; `clipboard.writeFiles`; `apps.open`; `media.open`; the `files.accessChanged` event | Read and change your files |
| `sensors` | `scene.headPose` | Know where you are looking |
| `windows` | `windows.list`, `windows.focus`; the `windows.changed` event | See and switch your open windows |
| `apps` | `apps.list`, `apps.launch`; the `apps.changed` event | See and open your apps |
| `screen` | `screen.capture`, `recording`, `startRecording`, `stopRecording`; the `screen.recordingChanged` event | Capture what you see |

## Never available

Settings, the browser's tabs, history, bookmarks and downloads, the launcher,
plugins and the dock's status items are for Halone's own apps. The client has
methods for them (`halone.settings`, `halone.browser`, and so on), and calling
them from a third-party app fails with `permission-denied`.

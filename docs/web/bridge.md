# How the bridge works

You do not need this to write an app: `useHalone()` does all of it. It helps
when reading the simulator's bridge log, or when an app fails to connect.

## The connection

Each app window gets one `MessageChannel` to the shell. The handshake is the
same in the simulator and on Android:

1. The shell posts `{ halone: 'connect', protocolVersion, windowId }` to the
   app's window, with the port transferred. On the phone that happens once per
   page load. In the simulator the app first posts `{ halone: 'hello' }` to its
   parent, and the shell answers, so a page never receives a port it would
   ignore.
2. Requests are `{ type: 'req', id, method, params }`, answered by
   `{ type: 'res', id, ok, result }` or `{ type: 'res', id, ok: false, error }`.
   Events are `{ type: 'evt', name, data }`.

Every message is JSON text on the wire, because Android's `WebMessagePort`
carries strings only.

The window's identity comes from the port, not from anything the app says, so
`windows.setTitle()` and `windows.close()` act on the caller. Only app windows
get a port. Web windows, which show arbitrary sites, never do.

## Connecting by hand

`useHalone()` is `createClient(connect())`, kept for the whole page.
`connect()` takes options for the rare case that needs them:

```ts
import { connect, createClient } from '@halone/sdk'

const halone = createClient(connect({ timeoutMs: 10_000 }))
```

The lower-level `Connection` has `call(method, params)` and `on(event,
listener)` over the method and event names of the protocol, typed by
`Methods` and `Events`.

## Errors

Calls reject with a `HaloneError`, which has a `code`:

| Code | When |
|---|---|
| `no-host` | Nothing connected within the timeout (5 s by default): the page is not running inside Halone. |
| `protocol` | The shell speaks a different protocol version than the SDK. |
| `permission-denied` | The app was not granted the permission the call needs, or the call is not available to apps. |
| `unknown-method` | The shell has no such method. |
| `closed` | The connection was closed. |
| `internal` | The call failed in the shell; the message says why. |

Other codes come from the method itself, such as `invalid-package`.

## Events

`halone.on(name, listener)` subscribes to an event and returns a function that
unsubscribes:

```ts
const off = halone.on('window.focusChanged', ({ focused }) => {
  document.body.classList.toggle('focused', focused)
})
```

An app hears only the events about itself, and those its permissions cover;
see [Permissions](./permissions).

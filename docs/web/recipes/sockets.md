# TCP sockets

A web page cannot open raw TCP connections, so the shell opens them for it.
This needs the `network.tcp` permission.

```json
{ "permissions": ["network.tcp"] }
```

`halone.sockets.connect` resolves with a `TcpSocket` once the connection is
open:

```ts
const socket = await halone.sockets.connect('github.com', 22)

const banner = await new Promise<string>((resolve) =>
  socket.onData((bytes) => resolve(new TextDecoder().decode(bytes).trim())),
)
await socket.close()
```

## Options

```ts
const socket = await halone.sockets.connect('example.com', 443, {
  tls: true,
  timeoutMs: 15_000,
})
```

`tls: true` wraps the connection in TLS. `timeoutMs` bounds how long
connecting may take.

## Reading and writing

- `onData(listener)` receives each chunk as a `Uint8Array`. Bytes that arrive
  before the first listener is added are kept and handed to it, so nothing is
  lost between connecting and subscribing.
- `write(data)` takes a `Uint8Array` or a string (sent as UTF-8), and resolves
  once the bytes are handed to the network, which is the signal to send more.
- `onClose(listener)` is called once the socket closes: with `null` when the
  other end or your own `close()` closed it, or with the error when the
  connection failed.
- `closed` says whether the socket is closed.

Each `on…` returns a function that removes the listener.

The socket belongs to the window that opened it and closes with it. The shell
stops reading from a socket while 8 chunks are unacknowledged; the SDK
acknowledges each one as it arrives.

## A stream for a library

The [SSH client](https://github.com/HaloneXR/halone-ssh) hands its SSH library
a stream over a socket. The shape is the same for any protocol library that
takes a duplex stream:

```ts
import type { TcpSocket } from '@halone/sdk'

class SocketStream {
  constructor(private readonly socket: TcpSocket) {
    socket.onData((bytes) => this.onData(bytes))
    socket.onClose((error) => (error ? this.onError(new Error(error)) : this.onEnd()))
  }

  write(data: Uint8Array) {
    return this.socket.write(data)
  }

  close() {
    return this.socket.close()
  }

  onData(bytes: Uint8Array) {}
  onError(error: Error) {}
  onEnd() {}
}
```

In the simulator, sockets are relayed through its dev server.

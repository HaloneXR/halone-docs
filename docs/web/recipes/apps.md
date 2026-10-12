# Launching other apps

## The browser

Any app can open a page in the browser, without a permission. It opens in a
new tab of the web window used last, or in a new web window if there is none:

```ts
await halone.browser.open('https://halone.dev')
await halone.browser.open('https://example.com', true)
```

The second argument opens it in a private tab.

## Apps

With the `apps` permission, an app can list the others and launch them.

```ts
const apps = await halone.apps.list()
const window = await halone.apps.launch('dev.example.notes')
```

Each [`AppInfo`](../reference/interfaces/AppInfo) has the app's `id`, `name`,
and `kind`: `system`, `web` (a site installed from the browser), `package` (a
Halone app) or `native` (a plugin's). `apps.list(true)` also lists hidden apps, the ones only opened for a file or
by the shell. Launching an app that is already open focuses its window.
`apps.changed` says an app was installed or removed.

### Routes

`apps.launch` takes a second argument, a route, saying where in the app to go.
For a site installed from the browser it is an address inside it; for an app
that reads `windows.route`, it is any string that app understands. The app being launched needs no permission to read it: a page that
loads after the request gets it from `windows.route()`, and a page already
running hears `window.routed`:

```ts
halone.windows.route().then(({ route }) => route && go(route))
halone.on('window.routed', ({ route }) => go(route))
```

```ts
await halone.apps.launch('dev.example.notes', 'note/42')
```

## Windows

With the `windows` permission, an app can see every open window, hear when they
change, and bring one to the front:

```ts
const windows = await halone.windows.list()
halone.on('windows.changed', (windows) => render(windows))
await halone.windows.focus(windows[0].id)
```

## Where the wearer is looking

With `sensors`, `scene.headPose()` answers with the wearer's heading:
`yawDegrees`, clockwise from forward, and `pitchDegrees`, positive up.
`scene.recenter()`, which needs no permission, makes the current heading
forward.

# Getting started

A Halone web app is a Vite project with a `halone.json` manifest in `public/`.
It runs in a window of its own and talks to the shell through
[`@halone/sdk`](https://www.npmjs.com/package/@halone/sdk). The `halone`
command from [`@halone/cli`](https://www.npmjs.com/package/@halone/cli) runs
it with hot reload and packages it as a `.halone` file.

This guide builds a small app, the same as
[`hello`](https://github.com/HaloneXR/halone-examples/tree/main/hello) in
halone-examples.

## What you need

- Node.js and npm (or pnpm).
- Somewhere to run the app, one of:
  - **Halone on the phone**, with XREAL glasses attached (see
    [halone.app](https://halone.app)), and `adb` connected to the phone. The
    glasses take the USB-C port, so connect adb over Wi-Fi.
  - **The simulator**, a desktop stand-in for the shell that runs in the
    browser. See [The simulator](./simulator) for how to start it.

## Turn on developer mode

In Halone, or in the simulator, open **Settings → Developer** and turn on
**Developer mode**. It lets the CLI install apps over adb and run apps from your
development server. Turning it off removes any app running from a server.

## Create the project

Start from any Vite project. The vanilla TypeScript template is enough:

```sh
npm create vite@latest hello -- --template vanilla-ts
cd hello
npm install @halone/sdk
npm install -D @halone/cli
```

`@halone/cli` builds with the project's own Vite, so the app needs Vite 8 as a
dependency, which the template gives it. Add scripts for the CLI to
`package.json`:

```json
{
  "scripts": {
    "dev": "halone dev",
    "pack": "halone pack"
  }
}
```

## Write the manifest

Create `public/halone.json`. Vite serves `public/` at the root and copies it
into the build, which is where the CLI looks for it.

```json
{
  "id": "dev.example.hello",
  "name": "Hello",
  "version": "0.1.0",
  "description": "A first Halone app",
  "icon": "icon.png",
  "window": { "width": 800, "height": 500 },
  "permissions": ["clipboard", "network.tcp"]
}
```

`id`, `name` and `version` are required. `icon` names a PNG in the package, so
put one at `public/icon.png` (192 px or more), or leave the field out.
[The manifest](./manifest) lists every field, and
[Permissions](./permissions) what each permission allows.

## Talk to the shell

`useHalone()` returns the client, shared by the whole page. It connects when
first called; `halone.ready` resolves once the shell has answered, and every
call waits for it on its own.

```ts [src/main.ts]
import { useHalone } from '@halone/sdk'

const halone = useHalone()
const out = document.querySelector('#out')!

halone.windows.self().then((self) => {
  out.textContent = `Window ${self.id}, ${self.widthPx}×${self.heightPx}`
})

document.querySelector('#title')!.addEventListener('click', () => {
  halone.windows.setTitle('Hello from Halone')
})

document.querySelector('#paste')!.addEventListener('click', async () => {
  const { text } = await halone.clipboard.read()
  out.textContent = text ?? '(nothing to paste)'
})

document.querySelector('#windows')!.addEventListener('click', () => {
  halone.windows.list().catch((error) => {
    out.textContent = `${error.name}: ${error.message}`
  })
})
```

```html [index.html]
<body>
  <p id="out">Connecting…</p>
  <button id="title">Rename my window</button>
  <button id="paste">Read the clipboard</button>
  <button id="windows">List all windows</button>
  <script type="module" src="/src/main.ts"></script>
</body>
```

`clipboard.read()` works because the manifest asks for `clipboard`.
`windows.list()` needs the `windows` permission, which this app does not
have, so it fails with a `HaloneError` whose `code` is `permission-denied`.

Opened in an ordinary browser tab, the page has no shell to talk to, and calls
fail with `no-host` after 5 seconds.

::: tip Designing for the glasses
The glasses add light to what is behind them, so black is transparent and
white is bright. Prefer near-black surfaces and emphasis by light rather than
fill, and keep text at 20 px or more: one degree is about 56 CSS pixels.
:::

## Run it

With the simulator running:

```sh
npm run dev
```

The app opens in the simulator, and edits reload it. On the glasses, with
developer mode on in Halone and adb connected:

```sh
npx halone dev --device
```

The CLI serves the app on port 5180 and forwards it to the phone with
`adb reverse`. A dev app is granted its manifest's permissions without a
prompt, and goes away when `halone dev` stops. DevTools for an app on the
glasses are at `chrome://inspect` in Chrome on your computer.

## Package and install it

```sh
npm run pack
```

`halone pack` runs `vite build` and zips `dist/` into
`dev.example.hello-0.1.0.halone` in the current folder (`--out` picks another). Install it on the
phone, and open it:

```sh
npx halone install dev.example.hello-0.1.0.halone --device --launch
```

A `.halone` file can also be opened on the phone, which shows the install
prompt with the app's name, where it came from and its permissions. See
[The halone CLI](./cli) for the other commands.

## Next

- [The manifest](./manifest) and [Permissions](./permissions)
- [The halone client](./api): every call an app can make
- Recipes, starting with [Shaping the window](./recipes/window)

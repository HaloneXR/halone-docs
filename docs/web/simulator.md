# The simulator

The simulator is a desktop stand-in for the shell, so apps can be built and
debugged without the phone or the glasses. It renders what one eye of the
glasses sees: a 1920 × 1080 view with the vertical field of view of an XREAL
Air 2 Pro, and windows as live iframes on a cylinder 4 m away. Windows are
sized as on the glasses, so an 800 px window looks as wide there as it will
when worn.

## Running it

It is part of the [halone](https://github.com/HaloneXR/halone) repository:

```sh
git clone --recurse-submodules https://github.com/HaloneXR/halone.git
cd halone/web
pnpm run sdk
pnpm install
pnpm dev
```

`pnpm run sdk` installs and builds the SDK submodule, and `pnpm dev` serves the
simulator. Open `http://127.0.0.1:5173`, turn on **Settings → Developer → Developer mode**,
and run `halone dev` from your app's folder.

## Using it

- **Look around**: drag the background, or use the arrow keys (Shift for 10°).
- **Move a window**: drag its bar.
- **Keys**: `R` recenters, `L` opens the launcher, `` ` `` toggles the sidebar.
- **Sidebar**: a top-down map of the windows, app launch buttons, a URL
  opener, the window list, live settings, and a **bridge log** of every
  request, response and event per window.
- **Room (additive)** blends windows over a picture of a room the way the
  glasses' optics combine them: black disappears and white areas are heavy.
  Worth a look before shipping any bright UI.

For scripted debugging, `window.__halone` in the simulator page exposes the
`shell` and the `bridge`, including its `traffic`.

The simulator relays `sockets.*` through its dev server, so TCP works there as
on the phone. Its files are sample pictures and videos from the repository, or
any folder named by the `HALONE_FILES` environment variable.

## Where it differs from the glasses

- It is mono, with no lens distortion and no prediction. A stereo region is
  only outlined, and the immersive player shows the left eye.
- Following and collisions are the glasses' own code, compiled to JavaScript,
  but the mouse is not a head: judge feel on the glasses.
- Apps are served from a different origin than the simulator, so an app has to
  go through the bridge, as on the device.
- Many sites refuse to be framed, so some web windows show an error that the
  phone's browser would not.
- `minHalone` is not checked.

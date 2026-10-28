# The display

The wearer picks the glasses' refresh rate, and whether the environment is
drawn in 3D, in Settings. Any app can read what the glasses are doing, with no
permission:

```ts
const display = await halone.display.state()
```

A [`DisplayState`](../reference/interfaces/DisplayState) has:

- **`running`**: whether the environment is running on the glasses.
- **`stereo`**: `true` while it is drawn in 3D, one image per eye; `false` in
  2D, where both eyes see one picture, or when it is not running.
- **`refreshHz`**: the rate the glasses' display runs at, or `null` when not
  running.
- **`renderFps`**: the frames Halone actually drew over the last second, or
  `null`. It is measured when you ask, so call `display.state()` again for a
  new reading.
- **`rates`**: the rates the connected glasses can be switched to, each a
  [`DisplayRate`](../reference/interfaces/DisplayRate) saying whether 3D is
  possible at it (`stereo`) and whether the phone's own screen keeps up with
  it (`matchesPhone`). Empty when Halone cannot switch these glasses.
- **`restartNeeded`**: the wearer changed the rate or 3D setting while
  running; it applies from the next start.

## Following changes

`display.changed` carries the new state whenever the environment starts or
stops, or the glasses change mode: 2D or 3D, or a new refresh rate.

```ts
import { useHalone, type DisplayState } from '@halone/sdk'

const halone = useHalone()

const show = (display: DisplayState) => {
  document.body.classList.toggle('flat', !display.stereo)
}

halone.display.state().then(show)
halone.on('display.changed', show)
```

## 3D content in 2D

A [stereo region](./window#stereo-pictures) has no depth while the
environment is in 2D, since both eyes get the same picture. An app that shows
stereo pictures or video can check `stereo` and offer a flat view instead, or
tell the wearer that 3D is off.

## Changing the mode

Changing the rate or the 3D setting, and restarting the environment to apply
them (`display.restart`), are for Halone's own Settings app.

The simulator always reports `running`, its own rate setting, and a
`renderFps` equal to it; it draws in mono whatever `stereo` says.

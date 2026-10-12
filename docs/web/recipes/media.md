# Stereo and 360° video

Ordinary 2D video is just a `<video>` in the page. For 3D and 360° video,
`halone.media` is the immersive player: one video at a time, decoded by the
shell at the file's own resolution, and drawn behind every window, either on a
big screen in the room or around the wearer.

Opening a file needs the `files` permission. Driving the player afterwards
needs none.

## Opening a video

```ts
import { layoutFromName, useHalone } from '@halone/sdk'

const halone = useHalone()

const layout = layoutFromName(entry.name) ?? { projection: 'flat', stereo: 'mono' }
const state = await halone.media.open(entry.path, layout)
```

A layout has a `projection` and a `stereo` layout:

| `projection` | |
|---|---|
| `flat` | A screen in the room |
| `equirect-180` | A half sphere around the wearer |
| `equirect-360` | A whole sphere around the wearer |

| `stereo` | |
|---|---|
| `mono` | One picture for both eyes |
| `side-by-side` | Left eye on the left |
| `top-bottom` | Left eye on top |

`layoutFromName` reads the usual conventions in a file name (`_360`, `_180`,
`_SBS`, `_LR`, `_TB`, `_OU`) and returns `null` when the name declares none.
It is only a hint: let the wearer correct it with `setLayout`.

A third argument to `open` starts playback at that many seconds.

## Controlling it

```ts
await halone.media.play()
await halone.media.pause()
await halone.media.seek(90)
await halone.media.setLayout({ projection: 'equirect-360', stereo: 'top-bottom' })
await halone.media.recenter()
await halone.media.setRotatable(true)
await halone.media.close()
```

`recenter` puts the screen of a flat layout, or the front of a sphere, where the
wearer is looking. `setRotatable(true)` lets a drag that starts on empty space,
outside every window, turn the video around the wearer, for looking about a
360° scene without turning round.

The window that opened the player owns it. Only that window can drive it, only
it hears `media.changed`, and closing it closes the player.

## Following playback

`media.changed` arrives a few times a second while the video plays, with the
same `MediaState` as `media.state()`:

```ts
halone.on('media.changed', (state) => {
  progress.max = state.durationSeconds
  progress.value = state.positionSeconds
  playButton.textContent = state.playing ? 'Pause' : 'Play'
  if (state.error) showError(state.error)
})
```

`MediaState` also has `open`, `path`, `ended`, `rotatable`, and the decoded
frame's `videoWidthPx` and `videoHeightPx`, both eyes included.

The wearer's settings decide how wide the flat screen is, and how far a 180° or
360° video is zoomed out. The simulator is mono and shows the left eye.

## Stereo pictures in the window

For a stereo photo or a video drawn in the page itself, use
[`windows.setStereoRegion`](./window#stereo-pictures) instead.

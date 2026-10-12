# Shaping the window

Every app manages its own window without any permission. Sizes are in window
pixels, which are CSS pixels: one CSS pixel is one panel pixel.

## Title

```ts
await halone.windows.setTitle('SSH — example.com')
```

Set it whenever what the window shows changes, as the SSH client does for its
active tab.

## Where and how big

`windows.self()` describes the caller's window:

```ts
const self = await halone.windows.self()
```

It has the window's `id`, `title`, `widthPx` and `heightPx`, whether it is
`pinned` and `focused`, and where it is: `yawDegrees`, clockwise from forward,
and `pitchDegrees`, positive up.

## Size

The initial size comes from `window` in the [manifest](../manifest).
`windows.resize` changes it, within the window's limits, and answers with the
size it got:

```ts
const size = await halone.windows.resize(1200, 600)
```

A third argument, `'top'` or `'bottom'`, says which edge stays where it is when
the height changes.

`windows.setSizeLimits` replaces the window's size limits, and `null` restores
the ones its page declares. Halone's video app
locks itself to just its controls this way while a video plays immersively:

```ts
const self = await halone.windows.self()
const height = 120

await halone.windows.setSizeLimits({
  minWidthPx: self.widthPx,
  minHeightPx: height,
  maxWidthPx: self.widthPx,
  maxHeightPx: height,
})
await halone.windows.resize(self.widthPx, height, 'bottom')
```

and undoes it with `setSizeLimits(null)` and a resize back.

## Pinning and closing

A pinned window stays where it is in the room instead of following the wearer.
An app can pin or close only its own window:

```ts
await halone.windows.setPinned(true)
await halone.windows.close()
```

## Focus

```ts
halone.on('window.focusChanged', ({ focused }) => {
  if (!focused) pauseAnimations()
})
```

## Hiding every window

`windows.setAutoHide(true)` asks for every window to fade out while the pointer
is on none of them, and come back as soon as it points at one, on top of the
wearer's own setting. A media player might ask for it while playing. The
request is the caller's: it ends when the app turns it off or its window
closes.

```ts
await halone.windows.setAutoHide(true)
```

## Stereo pictures

`windows.setStereoRegion` marks part of the window, in its own pixels, as a
side-by-side or top-bottom picture. Each eye is shown its own half, stretched
over the whole region, and the rest of the window stays as it is. Lay the
picture out at one eye's shape and keep UI out of the region:

```ts
import { eyeAspect, fitBox } from '@halone/sdk'

const img = document.querySelector('img')!
const aspect = eyeAspect(img.naturalWidth, img.naturalHeight, 'side-by-side')
const box = fitBox(window.innerWidth, window.innerHeight, aspect)

Object.assign(img.style, {
  position: 'absolute',
  left: `${box.x}px`,
  top: `${box.y}px`,
  width: `${box.width}px`,
  height: `${box.height}px`,
})

await halone.windows.setStereoRegion({
  stereo: 'side-by-side',
  xPx: Math.round(box.x),
  yPx: Math.round(box.y),
  widthPx: Math.round(box.width),
  heightPx: Math.round(box.height),
})
```

`setStereoRegion(null)` stops. `eyeAspect` works out the shape of one eye's
picture from the frame: a side-by-side frame much wider than 2:1 is full width
per eye, anything narrower is the usual half-width kind. `fitBox` is
`object-fit: contain` for that shape. For `.mpo` files, as a Nintendo 3DS or a
Fujifilm W3 saves them, `splitMpo(bytes)` returns the left and right JPEGs.

The simulator only outlines the region.

# Files

`halone.files` reads and changes the phone's shared storage. It needs the
`files` permission.

```json
{ "permissions": ["files"] }
```

## Access

On the phone, reading shared storage needs Android's "all files access" for
Halone. Check for it first:

```ts
const { granted } = await halone.files.access()
halone.on('files.accessChanged', ({ granted }) => refresh(granted))
```

Asking for it (`files.requestAccess`) is reserved for Halone's own apps, such
as Files. If it is not granted, tell the wearer to allow it there.

## Browsing

Paths are absolute and `/`-separated, and what they name is the shell's
business: treat them as opaque, and build new ones only from paths the shell
gave you.

```ts
const roots = await halone.files.roots()
const entries = await halone.files.list(roots[0].path)
const entry = await halone.files.stat(entries[0].path)
```

A root has a `kind`, one of `storage`, `pictures`, `camera`, `movies`, `music`,
`downloads` and `documents`, a `name` and a `path`. An entry has its `path`,
`name`, `kind` (`directory` or `file`), `sizeBytes`, `modifiedAt` in
milliseconds since the epoch, `mimeType`, and `thumbnailUrl`: a small JPEG of a
picture or a frame of a video, where the shell can make one.

## Changing files

```ts
await halone.files.createDirectory(parent, 'Trips')
await halone.files.copy([a.path, b.path], folder)
await halone.files.move([a.path], folder)
await halone.files.rename(a.path, 'beach.jpg')
await halone.files.delete([a.path])
```

`copy`, `move`, `rename` and `createDirectory` answer with the new entries. A
copy whose name is already taken in the folder gets a number, as
`photo (2).jpg`.
`delete` is for good: shared storage has no bin.

## Path and type helpers

The SDK has helpers that work on the shell's paths and types:

| Helper | |
|---|---|
| `parentPath(path)` | The folder a path is in, or `null` for the root: `/a/b` for `/a/b/c.jpg` |
| `baseName(path)` | The last part of a path: `c.jpg` |
| `mimeTypeOf(name)` | The MIME type the shell gives a file of that name, or `null` |
| `mimeMatches(pattern, mimeType)` | Whether a type matches a pattern such as `image/*` |
| `isImage(entry)`, `isVideo(entry)` | Whether an entry is a picture or a video |

## Opening files from other apps

An app that lists MIME types in `opens` in its [manifest](../manifest) can be
asked to open files of those types. The first app that matches a file opens
it.

```json
{ "opens": ["text/markdown", "text/plain"] }
```

The window is launched or focused, and gets the path. A page that loads after
the request still gets it from `windows.openedFile()`, and a page already
running hears `window.fileOpened`:

```ts
halone.windows.openedFile().then(({ path }) => path && show(path))
halone.on('window.fileOpened', ({ path }) => show(path))
```

Neither needs a permission. To open a file in whatever app handles its type,
or in a given one, call `apps.open`, which needs `files`:

```ts
await halone.apps.open(entry.path)
await halone.apps.open(entry.path, 'dev.example.viewer')
```

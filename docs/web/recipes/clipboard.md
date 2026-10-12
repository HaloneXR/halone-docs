# The clipboard

Apps use the shell's clipboard. Writing text needs no permission; reading
needs `clipboard`.

```json
{ "permissions": ["clipboard"] }
```

```ts
await halone.clipboard.writeText(publicKey)

const { text, files } = await halone.clipboard.read()
if (text !== null) paste(text)
```

`read()` returns the text on the clipboard, or `null`, and the files on it, if
any.

## Files

With the `files` permission an app can put files on the clipboard, for a later
paste into a folder. `cut: true` means the paste moves them rather than copies
them.

```ts
await halone.clipboard.writeFiles({ paths: selected.map((entry) => entry.path), cut: false })

const { files } = await halone.clipboard.read()
if (files) {
  const pasted = files.cut
    ? await halone.files.move(files.paths, folder)
    : await halone.files.copy(files.paths, folder)
}
```

See [Files](./files) for paths and the rest of `halone.files`.

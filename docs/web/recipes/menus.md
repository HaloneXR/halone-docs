# Context menus

`menu.show` shows the shell's own context menu over the caller's window, at a
point in its pixels, and answers with the id of the item chosen, or `null` if
the wearer dismissed it. It needs no permission. Showing another menu dismisses
the one that is open.

```ts
import { useHalone, type MenuItem } from '@halone/sdk'

const halone = useHalone()

document.addEventListener('contextmenu', async (event) => {
  event.preventDefault()
  const items: MenuItem[] = [
    { id: 'open', label: 'Open' },
    { id: 'rename', label: 'Rename', disabled: !canRename },
    { separator: true },
    { id: 'delete', label: 'Delete', danger: true },
  ]
  const chosen = await halone.menu.show(items, Math.round(event.clientX), Math.round(event.clientY))
  if (chosen === 'open') open()
  if (chosen === 'rename') rename()
  if (chosen === 'delete') remove()
})
```

An item has an `id` and a `label`, and may be `disabled`, `danger` (drawn as a
destructive action) or `checked`. `{ separator: true }` draws a line.

The wearer asks for a context menu with a right click, a two-finger tap or a
still hold, depending on their input settings, and the page receives an
ordinary `contextmenu` event.

## Cut, copy and paste

Halone's own apps give every text field a menu like this, with the
[clipboard](./clipboard):

```ts
document.addEventListener('contextmenu', async (event) => {
  const field = event.target
  if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) return
  event.preventDefault()

  const start = field.selectionStart ?? 0
  const end = field.selectionEnd ?? 0
  const selected = field.value.slice(start, end)
  const clipboard = await halone.clipboard.read().catch(() => null)

  const chosen = await halone.menu.show(
    [
      { id: 'copy', label: 'Copy', disabled: !selected },
      { id: 'paste', label: 'Paste', disabled: !clipboard?.text },
    ],
    Math.round(event.clientX),
    Math.round(event.clientY),
  )

  if (chosen === 'copy') await halone.clipboard.writeText(selected)
  if (chosen === 'paste' && clipboard?.text) {
    field.focus()
    field.setRangeText(clipboard.text, start, end, 'end')
    field.dispatchEvent(new Event('input', { bubbles: true }))
  }
})
```

Paste needs the `clipboard` permission; without it, `clipboard.read()` fails
and the item stays disabled.

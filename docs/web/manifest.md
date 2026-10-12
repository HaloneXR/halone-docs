# The manifest

Every app has a `halone.json`. In a project it lives in `public/`, so Vite
serves it at the root and copies it into the build; in a package it is at the
root of the zip.

```json
{
  "id": "dev.example.ssh",
  "name": "SSH",
  "version": "1.0.0",
  "description": "Terminal sessions over SSH",
  "icon": "icon.png",
  "entry": "index.html",
  "window": { "width": 1024, "height": 700 },
  "permissions": ["network.tcp", "clipboard"],
  "opens": [],
  "color": "#1f3a5f",
  "minHalone": "2026.10.12"
}
```

## Fields

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Reverse-DNS, lowercase, such as `dev.example.ssh`; at most 63 characters. It is the host label of the app's origin and the name of its install folder. The ids of Halone's own apps, and ids starting with `web-` (installed sites), are reserved. |
| `name` | yes | Shown in the launcher and the title bar; up to 80 characters are kept. |
| `version` | yes | `major.minor.patch`. An update needs a higher one. |
| `description` | no | Up to 300 characters are kept. |
| `icon` | no | A PNG in the package, up to 1 MB, 192 px or more. |
| `entry` | no | The page to open, relative to the package root. `index.html` when left out. |
| `window` | no | The initial size, `{ "width": …, "height": … }`, each from 200 to 4096 px. 1024 × 768 when left out. |
| `permissions` | no | What the app may do beyond running its own window. See [Permissions](./permissions). An unknown permission is an error, so a typo cannot install an app that then fails at run time. |
| `opens` | no | MIME types the app opens, such as `image/*`. See [Files](./recipes/files#opening-files-from-other-apps). |
| `color` | no | The launcher tile's colour, `#rrggbb`. Taken from the icon when left out. |
| `minHalone` | no | The oldest Halone the app runs on, as `major.minor.patch`. Halone's versions are dates, such as `2026.10.12`. An older Halone refuses to install the app with the error `incompatible`. The simulator does not check it. |

Paths (`icon`, `entry`) are relative, `/`-separated, and cannot leave the
package: no leading `/`, no `\`, no `.` or `..` segments.

The CLI checks the manifest with the same rules as the shell before it runs or
packs an app, and stops with an error that names the problem. The checker is exported from the SDK for your own tooling. It throws a
`HaloneError` with the code `invalid-package`, and returns the manifest with
every default filled in:

```ts
import { checkManifest } from '@halone/sdk/package'

const manifest = checkManifest(JSON.parse(text))
console.log(manifest.window.width)
```

## The package

A `.halone` file is a zip with `halone.json` at its root. `halone pack` makes
one from Vite's build output, named `<id>-<version>.halone`, after checking
that `entry` and `icon` are files in the build. Files and folders whose names
start with `.` are left out.

Packages are unsigned. Opening one on the phone shows the install prompt with
the app's name, where it came from and the permissions it asks for. An update
must keep the `id`, and asks again only for permissions it adds.

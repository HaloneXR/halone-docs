# The halone CLI

`@halone/cli` installs the `halone` command. Run it from an app's folder: a
Vite project with `halone.json` in `public/` (or at the project root). It
builds with the project's own Vite (8 or later).

Install it in each project and run it with `npx` or a package script, or once
for every project with `npm install -g`:

```sh
npm install -D @halone/cli
```

Developer mode has to be on (**Settings → Developer**) in the simulator or on
the glasses.

## Commands

| Command | What it does |
|---|---|
| `halone dev [--device] [--port 5180]` | Serves the app with hot reload and runs it. |
| `halone pack [--out dir]` | Builds with Vite into `dist/`, then writes `<id>-<version>.halone`. |
| `halone install <file.halone> --device [--launch]` | Installs a package on the phone, and with `--launch` opens it. |
| `halone uninstall <id> [--device]` | Removes an app. |
| `halone list [--device]` | Prints the Halone apps installed, as JSON. |

## Options

| Option | Meaning |
|---|---|
| `--device` | The phone, over adb. Without it, the command goes to the simulator. |
| `--serial <s>` | Which phone, when adb sees more than one. |
| `--simulator <url>` | Where the simulator is; `http://127.0.0.1:5173` by default. |
| `--port <n>` | The port `halone dev` serves on; 5180 by default. It must be free. |
| `--out <dir>` | Where `halone pack` writes the package; the current folder by default. |
| `--launch` | With `install`, open the app once it is installed. |
| `-h`, `--help` | Prints the usage. |

## halone dev

`halone dev` starts Vite's dev server on `127.0.0.1` and asks the simulator, or
with `--device` the phone, to run the app from it. On the phone it first sets
up `adb reverse` for the port, so the phone reaches your computer at
`localhost`.

The app runs as a dev app: it is granted its manifest's permissions without a
prompt, and edits reload it. Ctrl+C removes it from the simulator or the
phone, and removes the port forward.

If Halone does not answer over adb, check that the environment is running on
the phone and that developer mode is on.

## halone install

Installing into the simulator is not supported yet: use `halone dev` there.
`halone install` pushes the file to the phone over adb and asks Halone to
install it, and prints the installed id and version.

# Versions

Halone's versions are the date of the release, such as `2026.10.28-alpha`. The
SDKs have version numbers of their own, and each Halone release supports the
SDKs that were current when it came out, and every version before them.

| Halone | `@halone/sdk` | `dev.halone:plugin-sdk` | Plugin contract |
|---|---|---|---|
| 2026.10.28-alpha | 0.3.0 | 0.3.0 | 2 |
| 2026.10.12-alpha | 0.1.0 | 0.1.0 | 1 |

SDK 0.2.0 came out between two Halone releases. Everything in it is in 0.3.0,
and 2026.10.28-alpha is the first Halone to support it.

## Building for an older Halone

**Web apps.** A call that an older Halone doesn't have fails with
`unknown-method` (see [errors](./web/bridge#errors)). To keep an app from
being installed where it can't work, set
[`minHalone`](./web/manifest) to the release that has what it needs, such as
`2026.10.28` for anything new in SDK 0.3.0.

**Native plugins.** A plugin built with SDK 0.2.0 or later speaks plugin
contract 2, and an older Halone shows it as incompatible. A plugin built for
contract 1 keeps working in every release since; it just has no
[settings or the environment's start and stop](./native/recipes/settings).

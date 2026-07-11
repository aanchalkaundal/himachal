# Desktop App — Build a local Windows `.exe` installer

The News Video Generator can be packaged as a **native Windows desktop app** that
runs **100% locally** — no cloud, no VPS. Everything (editor, live preview, and
**MP4/WebM rendering**) runs on the user's own machine.

## How it works

The desktop build is an **Electron** app that, on launch:

1. Starts the bundled **Next.js standalone server** locally (using Electron's
   built-in Node — the user does **not** need Node installed).
2. Points the **Remotion renderer** at a **pre-built composition bundle** shipped
   inside the app (`REMOTION_SERVE_DIR`), so no source or webpack is needed at
   runtime.
3. Opens the app in a native window pointing at the local server.

MP4/WebM export runs in that local server process via Remotion + the bundled
Windows compositor. On the **first render only**, Remotion downloads a small
headless-browser shell into the user's cache (one-time, needs internet once).

## Build the installer (run on a Windows machine)

Open a terminal **in the project folder** first (don't run from `C:\Windows\System32`),
and paste each command on its own line **without** the `#` notes (cmd is not bash — it
treats `#` as an argument):

```
cd /d "C:\Users\User\Desktop\हिमाचलप्रदेश.com"
```
```
npm install
```
```
npm run dist
```

Step 1 installs deps + downloads Electron/build tools (~150–250 MB). Step 2 builds the
desktop app and produces the installer `.exe`.

The installer is written to:

```
dist/News Himachal Studio Setup <version>.exe
```

Double-click it to install (NSIS installer — choose folder, creates Start-menu +
desktop shortcut). Launch **News Himachal Studio** from the Start menu.

### Faster test build (no installer, just an unpacked app)

```bash
npm run dist:dir
# → dist/win-unpacked/News Himachal Studio.exe   (run directly, no install)
```

## Scripts

| Script | What it does |
|---|---|
| `npm run build:desktop` | `DESKTOP=1 next build` (standalone) → pre-bundle Remotion → assemble `.next/standalone` |
| `npm run dist` | `build:desktop` → `electron-builder --win` → NSIS `.exe` installer |
| `npm run dist:dir` | `build:desktop` → unpacked app folder (quick test) |
| `npm run electron:dev` | Run Electron against a running `next dev` (dev loop) |
| `npm run bundle:remotion` | Pre-bundle the Remotion composition to `remotion-serve/` |

## Key files

- [`electron/main.cjs`](electron/main.cjs) — Electron main process (starts the local server + window).
- [`scripts/bundle-remotion.mjs`](scripts/bundle-remotion.mjs) — pre-bundles the Remotion composition.
- [`scripts/prepare-desktop.mjs`](scripts/prepare-desktop.mjs) — assembles the standalone bundle (static + public + remotion-serve).
- [`next.config.mjs`](next.config.mjs) — `output: "standalone"` when `DESKTOP=1`.
- [`src/server/renderer.ts`](src/server/renderer.ts) — uses `REMOTION_SERVE_DIR` (the pre-built bundle) when packaged.
- `package.json` → `build` block — electron-builder config (appId, NSIS target).

## Notes & size

- **Installer size:** large (~400–600 MB) because it bundles Remotion's renderer
  and the native Windows compositor. This is expected for a self-contained local
  renderer.
- **First render:** downloads Remotion's headless shell once (needs internet).
  After that, rendering is fully offline.
- **No AI, no cloud:** rendering uses the user's CPU/RAM. 4K/60 fps is heavy —
  long/high-res exports take time and memory on the local machine.
- The app data (saved projects) lives in the browser storage of the Electron
  window (IndexedDB), on the user's machine.

## Verified

The build pipeline was verified to produce a self-contained standalone server
that includes `@remotion/renderer`, `@remotion/bundler`, the Windows compositor
binary, the pre-built composition bundle, and all static assets. The final
`electron-builder` packaging step must be run on a Windows machine (it downloads
platform-specific Electron binaries).

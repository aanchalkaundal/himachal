/**
 * Electron main process for the News Video Generator desktop app.
 *
 * Everything runs on the user's machine — there is NO cloud/VPS:
 *   1. Spawn the bundled Next.js standalone server (Node) on a local port.
 *   2. Point the Remotion renderer at the pre-built bundle (REMOTION_SERVE_DIR).
 *   3. Load the app in a native window.
 *
 * MP4/WebM rendering happens in the local server process (Remotion downloads its
 * headless shell into the user's cache on first render).
 */
const { app, BrowserWindow, shell, dialog } = require("electron");
const { spawn } = require("node:child_process");
const path = require("node:path");
const http = require("node:http");

const PORT = Number(process.env.NVG_PORT || 34567);
const isDev = !app.isPackaged;

let serverProcess = null;
let mainWindow = null;

/** In production the app is unpacked under resources/app.standalone. */
function resourcePath(...p) {
  return isDev ? path.join(__dirname, "..", ...p) : path.join(process.resourcesPath, ...p);
}

function startServer() {
  const standaloneDir = resourcePath("app.standalone");
  const serverJs = path.join(standaloneDir, "server.js");
  const serveDir = resourcePath("app.standalone", "remotion-serve");

  // Run the standalone server using Electron's bundled Node (ELECTRON_RUN_AS_NODE),
  // so the user doesn't need Node installed.
  serverProcess = spawn(process.execPath, [serverJs], {
    cwd: standaloneDir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: String(PORT),
      HOSTNAME: "127.0.0.1",
      REMOTION_SERVE_DIR: serveDir,
    },
    stdio: "pipe",
  });

  serverProcess.stdout?.on("data", (d) => console.log("[server]", d.toString().trim()));
  serverProcess.stderr?.on("data", (d) => console.error("[server]", d.toString().trim()));
  serverProcess.on("exit", (code) => console.log("[server] exited", code));
}

/** Poll the local server until it answers, then resolve. */
function waitForServer(timeoutMs = 30000) {
  const url = `http://127.0.0.1:${PORT}/`;
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.destroy();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) reject(new Error("Server did not start in time"));
        else setTimeout(tick, 300);
      });
    };
    tick();
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 950,
    backgroundColor: "#0b0f17",
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });

  // Open external links in the system browser, not inside the app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  try {
    await waitForServer();
    await mainWindow.loadURL(`http://127.0.0.1:${PORT}/`);
  } catch (err) {
    dialog.showErrorBox("Startup error", String(err));
  }
  mainWindow.show();
}

app.whenReady().then(async () => {
  if (isDev) {
    // In dev, assume `next dev` is already running on NVG_PORT (or 3000).
    mainWindow = new BrowserWindow({ width: 1500, height: 950, backgroundColor: "#0b0f17" });
    await mainWindow.loadURL(`http://127.0.0.1:${process.env.NVG_PORT || 3000}/`);
    return;
  }
  startServer();
  await createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

function shutdown() {
  if (serverProcess && !serverProcess.killed) {
    try {
      serverProcess.kill();
    } catch {
      /* ignore */
    }
  }
}

app.on("window-all-closed", () => {
  shutdown();
  if (process.platform !== "darwin") app.quit();
});
app.on("before-quit", shutdown);
process.on("exit", shutdown);

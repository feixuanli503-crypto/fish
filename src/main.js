const { app, BrowserWindow, globalShortcut, ipcMain, shell, screen } = require("electron");
const fs = require("fs");
const path = require("path");

const userDataPath = app.isPackaged
  ? path.join(app.getPath("appData"), app.getName())
  : path.join(__dirname, "..", ".electron-user-data");
const cachePath = path.join(userDataPath, "cache");

fs.mkdirSync(cachePath, { recursive: true });
app.setPath("userData", userDataPath);
app.commandLine.appendSwitch("disk-cache-dir", cachePath);
app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");

let mainWindow;
let lastWindowBounds;
let normalWindowBounds;
let isMiniMode = false;
let windowOpacity = 0.92;

const DEFAULT_SHORTCUTS = {
  hide: "Alt+1",
  show: "Alt+2",
  mini: "Ctrl+3",
  quit: "Alt+`",
};

let currentShortcuts = { ...DEFAULT_SHORTCUTS };

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
}

function normalizeShortcut(shortcut, fallback) {
  const rawShortcut = String(shortcut || fallback || "").trim();
  if (!rawShortcut) return fallback;

  return rawShortcut
    .split("+")
    .map((part) => {
      const token = part.trim();
      const lowerToken = token.toLowerCase();

      if (lowerToken === "ctrl" || lowerToken === "control") return "CommandOrControl";
      if (lowerToken === "cmd" || lowerToken === "command") return "Command";
      if (lowerToken === "cmdorctrl" || lowerToken === "commandorcontrol") {
        return "CommandOrControl";
      }
      if (lowerToken === "alt" || lowerToken === "option") return "Alt";
      if (lowerToken === "shift") return "Shift";
      if (lowerToken === "super" || lowerToken === "meta") return "Super";
      if (lowerToken === "·" || lowerToken === "grave" || lowerToken === "backquote") return "`";

      return token.length === 1 ? token.toUpperCase() : token;
    })
    .join("+");
}

function sendWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  mainWindow.webContents.send("window:state-changed", {
    isFullScreen: mainWindow.isFullScreen(),
    isMaximized: mainWindow.isMaximized(),
    isMiniMode,
  });
}

function rememberWindowBounds() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isFullScreen() || mainWindow.isMaximized() || mainWindow.isMinimized()) return;
  if (isMiniMode) return;
  lastWindowBounds = mainWindow.getBounds();
}

function animateWindowOpacity(from, to, onComplete) {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  const duration = 150;
  const startedAt = Date.now();
  const tickMs = 16;

  mainWindow.setOpacity(from);

  const timer = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      clearInterval(timer);
      return;
    }

    const progress = Math.min(1, (Date.now() - startedAt) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    mainWindow.setOpacity(from + (to - from) * eased);

    if (progress >= 1) {
      clearInterval(timer);
      mainWindow.setOpacity(to);
      onComplete?.();
    }
  }, tickMs);
}

function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    showWindow();
    return mainWindow;
  }

  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 920,
    minHeight: 620,
    title: "摸鱼助手",
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    roundedCorners: true,
    vibrancy: "under-window",
    visualEffectState: "active",
    titleBarStyle: "hidden",
    show: false,
    opacity: 0,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    animateWindowOpacity(0, windowOpacity);
    sendWindowState();
  });

  mainWindow.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      stealthHide();
    }
  });

  mainWindow.on("resize", () => {
    rememberWindowBounds();
    sendWindowState();
  });
  mainWindow.on("move", rememberWindowBounds);
  mainWindow.on("enter-full-screen", sendWindowState);
  mainWindow.on("leave-full-screen", sendWindowState);
  mainWindow.on("maximize", sendWindowState);
  mainWindow.on("unmaximize", sendWindowState);
  mainWindow.on("restore", () => {
    animateWindowOpacity(0, windowOpacity);
    sendWindowState();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  return mainWindow;
}

function stealthHide() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  rememberWindowBounds();
  animateWindowOpacity(mainWindow.getOpacity(), 0, () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.setSkipTaskbar(true);
    mainWindow.hide();
  });
}

function showWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.setSkipTaskbar(false);
  mainWindow.setOpacity(0);
  mainWindow.show();
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
  animateWindowOpacity(0, windowOpacity);
  sendWindowState();
}

function hideAllWindows() {
  stealthHide();
}

function showAllWindows() {
  showWindow();
}

function setMiniMode(enabled) {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  if (enabled === isMiniMode) return isMiniMode;

  if (enabled) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    if (mainWindow.isFullScreen()) mainWindow.setFullScreen(false);

    normalWindowBounds = mainWindow.getBounds();
    const display = screen.getDisplayMatching(normalWindowBounds);
    const miniWidth = 520;
    const miniHeight = 360;
    const x = Math.min(
      Math.max(display.workArea.x, normalWindowBounds.x + normalWindowBounds.width - miniWidth),
      display.workArea.x + display.workArea.width - miniWidth
    );
    const y = Math.min(
      Math.max(display.workArea.y, normalWindowBounds.y),
      display.workArea.y + display.workArea.height - miniHeight
    );

    mainWindow.setMinimumSize(360, 240);
    mainWindow.setAlwaysOnTop(true, "floating");
    mainWindow.setBounds({ x, y, width: miniWidth, height: miniHeight }, true);
    isMiniMode = true;
  } else {
    isMiniMode = false;
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setMinimumSize(920, 620);
    if (normalWindowBounds) mainWindow.setBounds(normalWindowBounds, true);
  }

  mainWindow.webContents.send("window:mini-mode-changed", { isMiniMode });
  sendWindowState();
  return isMiniMode;
}

function toggleMiniMode() {
  return setMiniMode(!isMiniMode);
}

function registerShortcuts() {
  globalShortcut.unregisterAll();

  const shortcutActions = {
    hide: hideAllWindows,
    show: showAllWindows,
    mini: toggleMiniMode,
    quit: () => {
      app.isQuitting = true;
      app.quit();
    },
  };

  Object.entries(shortcutActions).forEach(([key, action]) => {
    const accelerator = currentShortcuts[key] || DEFAULT_SHORTCUTS[key];
    if (!accelerator) return;

    const registered = globalShortcut.register(accelerator, action);

    if (!registered && accelerator !== DEFAULT_SHORTCUTS[key]) {
      currentShortcuts[key] = DEFAULT_SHORTCUTS[key];
      globalShortcut.register(DEFAULT_SHORTCUTS[key], action);
    }
  });
}

function updateShortcuts(nextShortcuts = {}) {
  currentShortcuts = {
    hide: normalizeShortcut(nextShortcuts.hide, DEFAULT_SHORTCUTS.hide),
    show: normalizeShortcut(nextShortcuts.show, DEFAULT_SHORTCUTS.show),
    mini: normalizeShortcut(nextShortcuts.mini, DEFAULT_SHORTCUTS.mini),
    quit: normalizeShortcut(nextShortcuts.quit, DEFAULT_SHORTCUTS.quit),
  };
  registerShortcuts();
  return currentShortcuts;
}

app.whenReady().then(() => {
  createWindow();
  registerShortcuts();

  app.on("second-instance", () => {
    showWindow();
  });

  app.on("activate", () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      createWindow();
      return;
    }

    showWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

ipcMain.handle("window:minimize", () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  rememberWindowBounds();
  animateWindowOpacity(mainWindow.getOpacity(), 0, () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.minimize();
    mainWindow.setOpacity(windowOpacity);
  });
});

ipcMain.handle("window:hide", () => {
  stealthHide();
});

ipcMain.handle("window:show", () => {
  showWindow();
});

ipcMain.handle("window:quit", () => {
  app.isQuitting = true;
  app.quit();
});

ipcMain.handle("mini:toggle", () => {
  return toggleMiniMode();
});

ipcMain.handle("mini:set-mode", (_event, enabled) => {
  return setMiniMode(Boolean(enabled));
});

ipcMain.handle("window:toggle-full-screen", () => {
  if (!mainWindow || mainWindow.isDestroyed()) return false;

  if (mainWindow.isFullScreen() || mainWindow.isMaximized()) {
    mainWindow.setFullScreen(false);
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    if (lastWindowBounds) mainWindow.setBounds(lastWindowBounds, true);
    sendWindowState();
    return false;
  }

  rememberWindowBounds();
  mainWindow.maximize();
  sendWindowState();
  return true;
});

ipcMain.handle("window:set-opacity", (_event, opacity) => {
  const safeOpacity = Math.min(1, Math.max(0.25, Number(opacity) || 1));
  windowOpacity = safeOpacity;
  mainWindow?.setOpacity(safeOpacity);
  return safeOpacity;
});

ipcMain.handle("shortcuts:update", (_event, shortcuts) => {
  return updateShortcuts(shortcuts);
});

ipcMain.handle("open:external", (_event, url) => {
  if (typeof url === "string" && /^https?:\/\//i.test(url)) {
    shell.openExternal(url);
  }
});

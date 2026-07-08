const { app, BrowserWindow, globalShortcut, ipcMain, shell } = require("electron");
const path = require("path");

let mainWindow;
let lastWindowBounds;
let windowOpacity = 0.92;

const DEFAULT_SHORTCUTS = {
  hide: "CommandOrControl+Alt+Q",
  show: "CommandOrControl+Alt+F",
  quit: "CommandOrControl+Alt+X",
};

let currentShortcuts = { ...DEFAULT_SHORTCUTS };

function sendWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  mainWindow.webContents.send("window:state-changed", {
    isFullScreen: mainWindow.isFullScreen(),
    isMaximized: mainWindow.isMaximized(),
  });
}

function rememberWindowBounds() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isFullScreen() || mainWindow.isMaximized() || mainWindow.isMinimized()) return;
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

function registerShortcuts() {
  globalShortcut.unregisterAll();

  const shortcutActions = {
    hide: stealthHide,
    show: showWindow,
    quit: () => {
      app.isQuitting = true;
      app.quit();
    },
  };

  Object.entries(shortcutActions).forEach(([key, action]) => {
    const accelerator = currentShortcuts[key] || DEFAULT_SHORTCUTS[key];
    const registered = globalShortcut.register(accelerator, action);

    if (!registered && accelerator !== DEFAULT_SHORTCUTS[key]) {
      currentShortcuts[key] = DEFAULT_SHORTCUTS[key];
      globalShortcut.register(DEFAULT_SHORTCUTS[key], action);
    }
  });
}

function updateShortcuts(nextShortcuts = {}) {
  currentShortcuts = {
    hide: String(nextShortcuts.hide || DEFAULT_SHORTCUTS.hide).trim(),
    show: String(nextShortcuts.show || DEFAULT_SHORTCUTS.show).trim(),
    quit: String(nextShortcuts.quit || DEFAULT_SHORTCUTS.quit).trim(),
  };
  registerShortcuts();
  return currentShortcuts;
}

app.whenReady().then(() => {
  createWindow();
  registerShortcuts();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
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

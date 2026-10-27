const contentView = document.querySelector("#contentView");
const browserCard = document.querySelector("#browserCard");
const homeCard = document.querySelector("#homeCard");
const pageTitle = document.querySelector("#pageTitle");
const opacitySlider = document.querySelector("#opacitySlider");
const miniOpacitySlider = document.querySelector("#miniOpacitySlider");
const opacityValue = document.querySelector("#opacityValue");
const shortcutHelp = document.querySelector("#shortcutHelp");
const fallbackNotice = document.querySelector("#fallbackNotice");
const todayDate = document.querySelector("#todayDate");
const todayBlessing = document.querySelector("#todayBlessing");
const homeGreeting = document.querySelector("#homeGreeting");
const homeSummary = document.querySelector("#homeSummary");
const toggleSidebarButton = document.querySelector("#toggleSidebarButton");
const settingsButton = document.querySelector("#settingsButton");
const settingsPanel = document.querySelector("#settingsPanel");
const settingsCloseButton = document.querySelector("#settingsCloseButton");
const minimizeButton = document.querySelector("#minimizeButton");
const maximizeButton = document.querySelector("#maximizeButton");
const maximizeIcon = document.querySelector("#maximizeIcon");
const closeButton = document.querySelector("#closeButton");
const miniModeButton = document.querySelector("#miniModeButton");
const shortcutHide = document.querySelector("#shortcutHide");
const shortcutShow = document.querySelector("#shortcutShow");
const shortcutMini = document.querySelector("#shortcutMini");
const shortcutQuit = document.querySelector("#shortcutQuit");
const saveShortcutsButton = document.querySelector("#saveShortcutsButton");
const settingsStatus = document.querySelector("#settingsStatus");
const fontSizeSelect = document.querySelector("#fontSizeSelect");
const themeButtons = document.querySelectorAll("[data-theme]");
const quickLinkButtons = document.querySelectorAll(".quick-link, .mini-quick-tab, .home-action-card");
const disguiseScreen = document.querySelector("#disguiseScreen");
const disguiseTitle = document.querySelector("#disguiseTitle");
const disguiseCalendarMonth = document.querySelector("#disguiseCalendarMonth");
const disguiseCalendarDate = document.querySelector("#disguiseCalendarDate");
const mouseLeaveDisguise = document.querySelector("#mouseLeaveDisguise");
const disguiseModeSelect = document.querySelector("#disguiseModeSelect");
const disguiseAutoMute = document.querySelector("#disguiseAutoMute");
const testDisguiseButton = document.querySelector("#testDisguiseButton");
const muteOnHide = document.querySelector("#muteOnHide");
const muteOnHeadphoneDisconnect = document.querySelector("#muteOnHeadphoneDisconnect");
const audioProtectionStatus = document.querySelector("#audioProtectionStatus");
const restoreAudioButton = document.querySelector("#restoreAudioButton");

const DOUYIN_URL = "https://www.douyin.com";
const BROWSER_ZOOM = 0.86;
const MINI_ZOOM = 0.55;
const MINI_REFERENCE_WIDTH = 508;
const MINI_REFERENCE_HEIGHT = 318;
const MINI_MIN_ZOOM = 0.34;
const MINI_MAX_ZOOM = BROWSER_ZOOM;
const ABORTED_LOAD_ERROR_CODE = -3;
const DESKTOP_USER_AGENT = navigator.userAgent;
const MINI_USER_AGENT =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
// 小红书会按 UA 判断终端：Electron UA 和移动 UA 都会返回“打开 App”引导页，
// 只有标准桌面 Chrome UA 才会进入 PC 网页版，所以固定伪装成桌面 Chrome。
const XIAOHONGSHU_DOMAINS = ["xiaohongshu.com"];
const DESKTOP_CHROME_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

function isXiaohongshuUrl(url) {
  try {
    const hostname = new URL(String(url || "")).hostname;
    return XIAOHONGSHU_DOMAINS.some((d) => hostname === d || hostname.endsWith("." + d));
  } catch {
    return false;
  }
}

const DEFAULT_SHORTCUTS = {
  hide: "Alt+1",
  show: "Alt+2",
  mini: "Ctrl+3",
  quit: "Alt+`",
};

const OLD_DEFAULT_SHORTCUTS = {
  hide: "CommandOrControl+Alt+Q",
  show: "CommandOrControl+Alt+F",
  quit: "CommandOrControl+Alt+X",
};

const LEGACY_DEFAULT_SHORTCUTS = {
  hide: ["Ctrl+1", OLD_DEFAULT_SHORTCUTS.hide],
  show: ["Ctrl+2", OLD_DEFAULT_SHORTCUTS.show],
  quit: ["Ctrl+Alt+X", OLD_DEFAULT_SHORTCUTS.quit],
};

const DEFAULT_SETTINGS = {
  fontSize: "15",
  theme: "auto",
  shortcuts: DEFAULT_SHORTCUTS,
  disguise: {
    mouseLeaveEnabled: false,
    mode: "code",
    autoMute: true,
  },
  muteProtection: {
    muteOnHide: false,
    muteOnHeadphoneDisconnect: false,
  },
};

const blessings = [
  "愿你今天摸鱼有分寸，忙碌有回报，心情保持晴朗。",
  "今天也别太紧绷，慢慢来，重要的事情都会完成。",
  "给自己留一点空白，效率和心情都会更好。",
  "愿今天的风刚刚好，事情顺一点，心里轻一点。",
];

const maximizeSvg = '<rect x="4.5" y="4.5" width="9" height="9" rx="1.8"></rect>';
const restoreSvg =
  '<rect x="6" y="4" width="8" height="8" rx="1.5"></rect><path d="M4 6.5v5c0 1 .8 1.8 1.8 1.8h5"></path>';

let currentUrl = "";
let currentNavigationUrl = "";
let navigationSequence = 0;
let isMiniMode = false;
let isDisguiseActive = false;
let audioWasMutedBeforeProtection = false;
let audioOutputSnapshot = [];
let zoomFrame = 0;
const protectionMuteReasons = new Set();
let settings = loadSettings();

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("fishDeskSettings") || "{}");
    const savedShortcuts = saved.shortcuts || {};
    const savedDisguise = saved.disguise || {};
    const savedMuteProtection = saved.muteProtection || {};
    const shortcuts = {
      ...DEFAULT_SHORTCUTS,
      ...savedShortcuts,
    };

    if (!savedShortcuts.hide || LEGACY_DEFAULT_SHORTCUTS.hide.includes(savedShortcuts.hide)) {
      shortcuts.hide = DEFAULT_SHORTCUTS.hide;
    }

    if (!savedShortcuts.show || LEGACY_DEFAULT_SHORTCUTS.show.includes(savedShortcuts.show)) {
      shortcuts.show = DEFAULT_SHORTCUTS.show;
    }

    if (!savedShortcuts.quit || LEGACY_DEFAULT_SHORTCUTS.quit.includes(savedShortcuts.quit)) {
      shortcuts.quit = DEFAULT_SHORTCUTS.quit;
    }

    if (!savedShortcuts.mini) shortcuts.mini = DEFAULT_SHORTCUTS.mini;

    return {
      ...DEFAULT_SETTINGS,
      ...saved,
      shortcuts,
      disguise: {
        ...DEFAULT_SETTINGS.disguise,
        ...savedDisguise,
      },
      muteProtection: {
        ...DEFAULT_SETTINGS.muteProtection,
        ...savedMuteProtection,
      },
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  localStorage.setItem("fishDeskSettings", JSON.stringify(settings));
}

function normalizeTarget(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) return currentUrl || "https://www.baidu.com";
  if (/^https?:\/\//i.test(value)) return value;
  if (/^[\w.-]+\.[a-z]{2,}/i.test(value)) return `https://${value}`;
  return `https://www.baidu.com/s?wd=${encodeURIComponent(value)}`;
}

function setActiveLink(url) {
  quickLinkButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.url === url);
  });
}

function syncOpacityControls(value) {
  const opacityPercent = String(value);

  if (opacitySlider && opacitySlider.value !== opacityPercent) {
    opacitySlider.value = opacityPercent;
  }

  if (miniOpacitySlider && miniOpacitySlider.value !== opacityPercent) {
    miniOpacitySlider.value = opacityPercent;
  }

  if (opacityValue) opacityValue.textContent = `${opacityPercent}%`;
}

async function setWindowOpacityFromControl(value) {
  const safeValue = Math.min(100, Math.max(35, Number(value) || 92));
  syncOpacityControls(safeValue);
  await window.fishDesk.setOpacity(safeValue / 100);
}

function isWebviewMuted() {
  try {
    return Boolean(contentView?.isAudioMuted?.());
  } catch {
    return false;
  }
}

function setWebviewMuted(muted) {
  try {
    contentView?.setAudioMuted?.(Boolean(muted));
  } catch {
    // The webview can be unavailable while its first page is attaching.
  }
}

function renderAudioProtectionStatus(message) {
  if (!audioProtectionStatus || !restoreAudioButton) return;

  if (message) {
    audioProtectionStatus.textContent = message;
  } else if (protectionMuteReasons.has("headphones")) {
    audioProtectionStatus.textContent = "检测到音频设备断开，已保护静音。";
  } else if (protectionMuteReasons.size > 0) {
    audioProtectionStatus.textContent = "声音已由保护功能静音。";
  } else {
    audioProtectionStatus.textContent = "声音保护未触发";
  }

  restoreAudioButton.hidden = protectionMuteReasons.size === 0;
}

function requestProtectionMute(reason, message) {
  if (protectionMuteReasons.size === 0) {
    audioWasMutedBeforeProtection = isWebviewMuted();
  }

  protectionMuteReasons.add(reason);
  setWebviewMuted(true);
  renderAudioProtectionStatus(message);
}

function releaseProtectionMute(reason) {
  protectionMuteReasons.delete(reason);
  if (protectionMuteReasons.size > 0) {
    renderAudioProtectionStatus();
    return;
  }

  if (!audioWasMutedBeforeProtection) {
    setWebviewMuted(false);
  }
  audioWasMutedBeforeProtection = false;
  renderAudioProtectionStatus();
}

function restoreAudioManually() {
  protectionMuteReasons.clear();
  audioWasMutedBeforeProtection = false;
  setWebviewMuted(false);
  renderAudioProtectionStatus("声音已恢复");
}

function handleProtectionAudioRequest(request = {}) {
  if (request.action === "mute" && request.reason === "hide") {
    if (settings.muteProtection.muteOnHide) {
      requestProtectionMute("hide", "窗口已隐藏，声音已自动静音。");
    }
    return;
  }

  if (request.action === "mute" && request.reason === "disguise") {
    if (settings.disguise.autoMute) {
      requestProtectionMute("disguise", "已进入伪装，声音已自动静音。");
    }
    return;
  }

  if (request.action === "restore") {
    releaseProtectionMute(request.reason);
  }
}

async function readAudioOutputSnapshot() {
  if (!navigator.mediaDevices?.enumerateDevices) return [];

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((device) => device.kind === "audiooutput")
      .map((device) => ({
        deviceId: device.deviceId,
        groupId: device.groupId,
        label: device.label,
      }));
  } catch {
    return [];
  }
}

function getAudioDeviceKey(device) {
  return `${device.deviceId}|${device.groupId}|${device.label}`;
}

async function refreshAudioOutputSnapshot() {
  audioOutputSnapshot = await readAudioOutputSnapshot();
}

async function handleAudioDeviceChange() {
  const previous = audioOutputSnapshot;
  const next = await readAudioOutputSnapshot();
  audioOutputSnapshot = next;

  if (!settings.muteProtection.muteOnHeadphoneDisconnect || previous.length === 0) return;

  const nextKeys = new Set(next.map(getAudioDeviceKey));
  const removedPhysicalDevice = previous
    .filter((device) => !["default", "communications"].includes(device.deviceId))
    .some((device) => !nextKeys.has(getAudioDeviceKey(device)));
  const outputCountDropped = next.length < previous.length;

  if ((removedPhysicalDevice && next.length <= previous.length) || outputCountDropped) {
    requestProtectionMute("headphones", "检测到音频设备断开，已立即静音。");
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getMiniZoomFactor() {
  const rect = contentView?.getBoundingClientRect?.();
  const width = rect?.width || MINI_REFERENCE_WIDTH;
  const height = rect?.height || MINI_REFERENCE_HEIGHT;
  const scale = Math.min(width / MINI_REFERENCE_WIDTH, height / MINI_REFERENCE_HEIGHT);

  return clamp(MINI_ZOOM * scale, MINI_MIN_ZOOM, MINI_MAX_ZOOM);
}

function getWebviewZoomFactor() {
  return isMiniMode ? getMiniZoomFactor() : BROWSER_ZOOM;
}

function applyWebviewZoom() {
  if (!contentView || !contentView.getWebContentsId) return;

  const zoomFactor = getWebviewZoomFactor();

  try {
    contentView.setZoomFactor(zoomFactor);
  } catch {
    contentView.addEventListener(
      "dom-ready",
      () => {
        try {
          contentView.setZoomFactor(zoomFactor);
        } catch {
          // Webview may not be ready yet on first load.
        }
      },
      { once: true }
    );
  }
}

function renderMiniMode() {
  document.body.classList.toggle("mini-mode", isMiniMode);
  if (!miniModeButton) return;

  miniModeButton.setAttribute("aria-pressed", String(isMiniMode));
  miniModeButton.setAttribute("aria-label", isMiniMode ? "返回正常窗口" : "切换小窗模式");
  miniModeButton.title = isMiniMode ? "恢复正常窗口" : "切换为小窗播放";
}

function renderDisguiseCalendar() {
  const now = new Date();
  const monthText = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
  }).format(now);
  const dateText = new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(now);

  disguiseCalendarMonth.textContent = monthText;
  disguiseCalendarDate.textContent = dateText;
}

function renderDisguiseState(state = {}) {
  isDisguiseActive = Boolean(state.active);
  const mode = state.mode || settings.disguise.mode;

  document.body.classList.toggle("disguise-active", isDisguiseActive);
  disguiseScreen.dataset.mode = mode;
  disguiseScreen.hidden = !isDisguiseActive || mode === "transparent";
  disguiseTitle.textContent = mode === "calendar" ? "日程安排" : "项目开发计划";

  if (isDisguiseActive && mode === "calendar") {
    renderDisguiseCalendar();
  }
}

function scheduleWebviewZoom() {
  if (zoomFrame) cancelAnimationFrame(zoomFrame);

  zoomFrame = requestAnimationFrame(() => {
    zoomFrame = 0;
    applyWebviewZoom();
  });
}

function getWebviewUserAgent() {
  // 小红书在普通和移动 UA 下都会跳“打开 App”，任何模式下都固定用桌面 Chrome UA。
  if (isXiaohongshuUrl(currentUrl)) return DESKTOP_CHROME_USER_AGENT;
  return isMiniMode ? MINI_USER_AGENT : DESKTOP_USER_AGENT;
}

function syncWebviewUserAgent() {
  if (!contentView) return;

  const userAgent = getWebviewUserAgent();
  contentView.setAttribute("useragent", userAgent);

  try {
    contentView.setUserAgent?.(userAgent);
  } catch {
    // Some webview builds only honor the attribute or loadURL option.
  }
}

function getNavigationErrorCode(error) {
  if (!error) return null;
  if (typeof error.errno === "number") return error.errno;
  if (typeof error.errorCode === "number") return error.errorCode;

  const match = String(error.message || error).match(/\((-?\d+)\)/);
  return match ? Number(match[1]) : null;
}

function isIgnorableLoadFailure(errorCode, isMainFrame = true) {
  return Number(errorCode) === ABORTED_LOAD_ERROR_CODE || isMainFrame === false;
}

function getFailureUrl(event = {}) {
  return event.validatedURL || event.url || event.srcURL || "";
}

function trimUrlTrailingSlash(url) {
  return String(url || "").replace(/\/$/, "");
}

function isCurrentNavigationFailureUrl(failedUrl) {
  if (!failedUrl || !currentNavigationUrl) return true;

  try {
    const failed = new URL(failedUrl);
    const current = new URL(currentNavigationUrl);
    const failedPath = trimUrlTrailingSlash(failed.pathname);
    const currentPath = trimUrlTrailingSlash(current.pathname);

    return (
      failed.href === current.href ||
      (failed.origin === current.origin && failedPath === currentPath && failed.search === current.search)
    );
  } catch {
    return trimUrlTrailingSlash(failedUrl) === trimUrlTrailingSlash(currentNavigationUrl);
  }
}

function shouldShowLoadFailure(event = {}) {
  const errorCode = Number(event?.errorCode);
  const isMainFrame = event?.isMainFrame;
  if (isIgnorableLoadFailure(errorCode, isMainFrame)) return false;

  if (isMainFrame === true) return true;

  return isCurrentNavigationFailureUrl(getFailureUrl(event));
}

function applyMiniViewportPatch() {
  if (!contentView?.executeJavaScript) return;

  const script = `
    (() => {
      const styleId = "fishdesk-mini-viewport";
      const enabled = ${JSON.stringify(isMiniMode)};
      const existing = document.getElementById(styleId);

      if (!enabled) {
        existing?.remove();
        return;
      }

      let viewport = document.querySelector('meta[name="viewport"]');
      if (!viewport) {
        viewport = document.createElement("meta");
        viewport.name = "viewport";
        document.head.appendChild(viewport);
      }
      viewport.content = "width=device-width, initial-scale=1, viewport-fit=cover";

      const style = existing || document.createElement("style");
      style.id = styleId;
      style.textContent = [
        "html,body{min-width:0!important;max-width:100vw!important;overflow-x:hidden!important;}",
        "img,video,canvas,iframe{max-width:100%!important;}",
        "[style*='min-width']{min-width:0!important;}"
      ].join("");
      if (!existing) document.head.appendChild(style);
    })();
  `;

  contentView.executeJavaScript(script, false).catch(() => {
    // Cross-origin pages can reject injection; zoom + mobile UA still apply.
  });
}

// 拦截网页内的原生全屏请求，转成仅在 webview 可视区内的“伪全屏”，
// 避免短视频/播放器的全屏按钮把整个应用窗口拉成全屏（尤其小窗模式下）。
function applyFullscreenGuard() {
  if (!contentView?.executeJavaScript) return;

  const script = `
    (() => {
      if (window.__fishdeskFullscreenGuard) return;
      window.__fishdeskFullscreenGuard = true;

      const styleId = "fishdesk-fs-guard";
      if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = [
          ".fishdesk-fs-root{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;max-width:none!important;max-height:none!important;margin:0!important;border-radius:0!important;z-index:2147483647!important;background:#000!important;}",
          ".fishdesk-fs-root video,.fishdesk-fs-root .player-area{width:100%!important;height:100%!important;}",
        ].join("");
        document.head.appendChild(style);
      }

      const exitFullscreen = () => document.querySelector(".fishdesk-fs-root.fishdesk-fs-active")?.classList.remove("fishdesk-fs-active");

      Element.prototype.requestFullscreen = function () {
        exitFullscreen();
        this.classList.add("fishdesk-fs-root", "fishdesk-fs-active");
        return Promise.resolve();
      };
      if (Element.prototype.webkitRequestFullscreen) {
        Element.prototype.webkitRequestFullscreen = Element.prototype.requestFullscreen;
      }
      if (Element.prototype.msRequestFullscreen) {
        Element.prototype.msRequestFullscreen = Element.prototype.requestFullscreen;
      }
      if (Document.prototype.exitFullscreen) {
        Document.prototype.exitFullscreen = function () { exitFullscreen(); return Promise.resolve(); };
      }
      if (Document.prototype.webkitExitFullscreen) {
        Document.prototype.webkitExitFullscreen = Document.prototype.exitFullscreen;
      }
      Object.defineProperty(document, "fullscreenElement", {
        get: () => document.querySelector(".fishdesk-fs-active"),
        configurable: true,
      });
      Object.defineProperty(document, "webkitFullscreenElement", {
        get: () => document.querySelector(".fishdesk-fs-active"),
        configurable: true,
      });
    })();
  `;

  contentView.executeJavaScript(script, false).catch(() => {
    // Cross-origin pages can reject injection.
  });
}

function navigateWebview(url) {
  const navigationId = ++navigationSequence;
  currentNavigationUrl = url;
  fallbackNotice.hidden = true;
  syncWebviewUserAgent();
  scheduleWebviewZoom();

  // Avoid webview.loadURL(): aborted navigations can make Electron print
  // GUEST_VIEW_MANAGER_CALL ERR_ABORTED noise even when the promise is caught.
  if (contentView.getAttribute("src") === url) {
    contentView.removeAttribute("src");
    requestAnimationFrame(() => {
      if (navigationId === navigationSequence) {
        contentView.setAttribute("src", url);
      }
    });
    return;
  }

  contentView.setAttribute("src", url);
}

async function setMiniMode(enabled) {
  const nextState = await window.fishDesk.setMiniMode(Boolean(enabled));
  isMiniMode = Boolean(nextState);
  renderMiniMode();
  syncWebviewUserAgent();
  scheduleWebviewZoom();
  applyMiniViewportPatch();

  if (currentUrl) {
    void navigateWebview(currentUrl);
  }
}

function toggleMiniMode() {
  setMiniMode(!isMiniMode);
}

function loadUrl(url) {
  currentUrl = normalizeTarget(url);
  pageTitle.textContent = currentUrl;
  fallbackNotice.hidden = true;
  document.body.classList.add("is-browsing");
  browserCard.classList.remove("is-home");
  homeCard.hidden = true;
  void navigateWebview(currentUrl);
  setActiveLink(currentUrl);
}

function showHome() {
  navigationSequence += 1;
  currentUrl = "";
  currentNavigationUrl = "";
  pageTitle.textContent = "首页";
  fallbackNotice.hidden = true;
  document.body.classList.remove("is-browsing");
  browserCard.classList.add("is-home");
  homeCard.hidden = false;
  contentView.removeAttribute("src");
  setActiveLink("");
}

function renderToday() {
  const now = new Date();
  const dateText = new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(now);
  const hour = now.getHours();
  const greeting = hour < 11 ? "早上好" : hour < 18 ? "下午好" : "晚上好";
  const blessing = blessings[now.getDate() % blessings.length];

  todayDate.textContent = dateText;
  todayBlessing.textContent = blessing;
  homeGreeting.textContent = `${greeting}，先看看今天，再决定去哪儿。`;
  homeSummary.textContent = blessing;
}

function openSettings() {
  settingsPanel.hidden = false;
  document.body.classList.add("settings-open");
  settingsButton.classList.add("active");
}

function closeSettings() {
  settingsPanel.hidden = true;
  document.body.classList.remove("settings-open");
  settingsButton.classList.remove("active");
}

function applyFontSize(size) {
  document.documentElement.style.setProperty("--base-font-size", `${size}px`);
  fontSizeSelect.value = String(size);
}

function getResolvedTheme(theme) {
  if (theme !== "auto") return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
  const resolvedTheme = getResolvedTheme(theme);
  document.documentElement.dataset.theme = resolvedTheme;

  themeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.theme === theme);
  });
}

function renderShortcutHelp() {
  shortcutHelp.textContent = "隐藏：Alt+1；显示：Alt+2；透明度：Alt+←/→；退出：Alt+·。";
}

function fillSettingsForm() {
  shortcutHide.value = settings.shortcuts.hide;
  shortcutShow.value = settings.shortcuts.show;
  if (shortcutMini) shortcutMini.value = settings.shortcuts.mini;
  shortcutQuit.value = settings.shortcuts.quit;
  fontSizeSelect.value = settings.fontSize;
  mouseLeaveDisguise.checked = settings.disguise.mouseLeaveEnabled;
  disguiseModeSelect.value = settings.disguise.mode;
  disguiseAutoMute.checked = settings.disguise.autoMute;
  muteOnHide.checked = settings.muteProtection.muteOnHide;
  muteOnHeadphoneDisconnect.checked = settings.muteProtection.muteOnHeadphoneDisconnect;
  renderShortcutHelp();
}

function applySettings() {
  applyFontSize(settings.fontSize);
  applyTheme(settings.theme);
  fillSettingsForm();
}

function updateMaximizeButton(isExpanded) {
  maximizeIcon.innerHTML = isExpanded ? restoreSvg : maximizeSvg;
  maximizeButton.setAttribute("aria-label", isExpanded ? "还原窗口" : "最大化");
  maximizeButton.title = isExpanded ? "还原窗口" : "最大化";
  maximizeButton.classList.toggle("is-restore", isExpanded);
}

quickLinkButtons.forEach((button) => {
  button.addEventListener("click", () => {
    loadUrl(button.dataset.url);
  });
});

miniModeButton?.addEventListener("click", toggleMiniMode);

opacitySlider?.addEventListener("input", () => {
  setWindowOpacityFromControl(opacitySlider.value);
});

miniOpacitySlider?.addEventListener("input", () => {
  setWindowOpacityFromControl(miniOpacitySlider.value);
});

toggleSidebarButton.addEventListener("click", () => {
  const collapsed = document.body.classList.toggle("sidebar-collapsed");
  toggleSidebarButton.setAttribute("aria-label", collapsed ? "展开左侧列表" : "收起左侧列表");
  toggleSidebarButton.title = collapsed ? "展开左侧列表" : "收起左侧列表";
});

settingsButton.addEventListener("click", () => {
  if (settingsPanel.hidden) {
    openSettings();
    return;
  }

  closeSettings();
});

settingsCloseButton.addEventListener("click", closeSettings);

themeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    settings.theme = button.dataset.theme;
    saveSettings();
    applyTheme(settings.theme);
  });
});

fontSizeSelect.addEventListener("change", () => {
  settings.fontSize = fontSizeSelect.value;
  saveSettings();
  applyFontSize(settings.fontSize);
});

saveShortcutsButton.addEventListener("click", async () => {
  const nextShortcuts = {
    hide: shortcutHide.value.trim() || DEFAULT_SHORTCUTS.hide,
    show: shortcutShow.value.trim() || DEFAULT_SHORTCUTS.show,
    mini: shortcutMini?.value.trim() || settings.shortcuts.mini || DEFAULT_SHORTCUTS.mini,
    quit: shortcutQuit.value.trim() || DEFAULT_SHORTCUTS.quit,
  };

  try {
    settingsStatus.textContent = "正在保存快捷键...";
    const registeredShortcuts = await window.fishDesk.updateShortcuts(nextShortcuts);
    settings.shortcuts = {
      ...DEFAULT_SHORTCUTS,
      ...(registeredShortcuts || nextShortcuts),
    };
    saveSettings();
    fillSettingsForm();
    settingsStatus.textContent = `快捷键已保存：隐藏 ${settings.shortcuts.hide}，显示 ${settings.shortcuts.show}，退出 ${settings.shortcuts.quit}。`;
  } catch (error) {
    settingsStatus.textContent = `保存失败：${error?.message || "请检查快捷键格式"}`;
  }
});

mouseLeaveDisguise.addEventListener("change", async () => {
  settings.disguise.mouseLeaveEnabled = mouseLeaveDisguise.checked;
  saveSettings();
  await window.fishDesk.updateDisguiseSettings(settings.disguise);
});

disguiseModeSelect.addEventListener("change", async () => {
  settings.disguise.mode = disguiseModeSelect.value;
  saveSettings();
  await window.fishDesk.updateDisguiseSettings(settings.disguise);
});

disguiseAutoMute.addEventListener("change", async () => {
  settings.disguise.autoMute = disguiseAutoMute.checked;
  saveSettings();
  if (!settings.disguise.autoMute) releaseProtectionMute("disguise");
  await window.fishDesk.updateDisguiseSettings(settings.disguise);
});

testDisguiseButton.addEventListener("click", async () => {
  await window.fishDesk.updateDisguiseSettings(settings.disguise);
  closeSettings();
  await window.fishDesk.testDisguise();
});

muteOnHide.addEventListener("change", () => {
  settings.muteProtection.muteOnHide = muteOnHide.checked;
  saveSettings();
  if (!settings.muteProtection.muteOnHide) releaseProtectionMute("hide");
});

muteOnHeadphoneDisconnect.addEventListener("change", async () => {
  settings.muteProtection.muteOnHeadphoneDisconnect = muteOnHeadphoneDisconnect.checked;
  saveSettings();
  if (settings.muteProtection.muteOnHeadphoneDisconnect) {
    await refreshAudioOutputSnapshot();
  } else {
    releaseProtectionMute("headphones");
  }
});

restoreAudioButton.addEventListener("click", restoreAudioManually);

minimizeButton.addEventListener("click", () => {
  window.fishDesk.minimize();
});

maximizeButton.addEventListener("click", async () => {
  const isExpanded = await window.fishDesk.toggleFullScreen();
  updateMaximizeButton(Boolean(isExpanded));
});

closeButton.addEventListener("click", () => {
  window.fishDesk.quit();
});

document.addEventListener("click", (event) => {
  const target = event.target;
  if (
    settingsPanel.hidden ||
    settingsPanel.contains(target) ||
    settingsButton.contains(target)
  ) {
    return;
  }

  closeSettings();
});

contentView.addEventListener("did-start-loading", () => {
  pageTitle.textContent = "正在加载...";
});

contentView.addEventListener("page-title-updated", (event) => {
  pageTitle.textContent = event.title || currentUrl;
});

contentView.addEventListener("did-fail-load", (event) => {
  if (!shouldShowLoadFailure(event)) return;

  fallbackNotice.hidden = false;
});

contentView.addEventListener("did-fail-provisional-load", (event) => {
  if (!shouldShowLoadFailure(event)) return;

  fallbackNotice.hidden = false;
});

contentView.addEventListener("did-finish-load", () => {
  fallbackNotice.hidden = true;
});

contentView.addEventListener("did-navigate", (event) => {
  if (event?.url) currentNavigationUrl = event.url;
  fallbackNotice.hidden = true;
});

contentView.addEventListener("did-navigate-in-page", () => {
  fallbackNotice.hidden = true;
});

contentView.addEventListener("dom-ready", () => {
  fallbackNotice.hidden = true;
  syncWebviewUserAgent();
  scheduleWebviewZoom();
  applyMiniViewportPatch();
  applyFullscreenGuard();
  if (protectionMuteReasons.size > 0) setWebviewMuted(true);
});

window.addEventListener("resize", scheduleWebviewZoom);

window.addEventListener("keydown", (event) => {
  if (isDisguiseActive && event.key === "Escape") {
    event.preventDefault();
    window.fishDesk.restoreDisguise();
    return;
  }

  if (event.altKey && !event.ctrlKey && !event.shiftKey && !event.metaKey) {
    if (event.key === "1") {
      event.preventDefault();
      window.fishDesk.hide();
      return;
    }

    if (event.key === "2") {
      event.preventDefault();
      window.fishDesk.show();
      return;
    }

    if (event.key === "`" || event.key === "·") {
      event.preventDefault();
      window.fishDesk.quit();
      return;
    }
  }

  if (event.key !== "Escape") return;

  if (!settingsPanel.hidden) {
    closeSettings();
    return;
  }

  if (isMiniMode) {
    setMiniMode(false);
    return;
  }

  window.fishDesk.hide();
});

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (settings.theme === "auto") applyTheme("auto");
});

window.fishDesk.onMiniModeChanged?.((state) => {
  isMiniMode = Boolean(state?.isMiniMode);
  renderMiniMode();
  scheduleWebviewZoom();
});

window.fishDesk.onWindowStateChanged?.((state) => {
  updateMaximizeButton(Boolean(state?.isFullScreen || state?.isMaximized));
  if (typeof state?.isMiniMode === "boolean") {
    isMiniMode = state.isMiniMode;
    renderMiniMode();
    scheduleWebviewZoom();
  }
});

window.fishDesk.onOpacityChanged?.((state) => {
  const opacityPercent = Number(state?.opacityPercent);
  if (Number.isFinite(opacityPercent)) {
    syncOpacityControls(opacityPercent);
    return;
  }

  const opacity = Number(state?.opacity);
  if (Number.isFinite(opacity)) syncOpacityControls(Math.round(opacity * 100));
});

window.fishDesk.onDisguiseStateChanged?.((state) => {
  renderDisguiseState(state);
});

window.fishDesk.onProtectionAudioRequested?.((request) => {
  handleProtectionAudioRequest(request);
});

navigator.mediaDevices?.addEventListener?.("devicechange", handleAudioDeviceChange);

renderToday();
applySettings();
renderMiniMode();
renderDisguiseState();
renderAudioProtectionStatus();
syncOpacityControls(opacitySlider?.value || miniOpacitySlider?.value || 92);
window.fishDesk.setOpacity(Number(opacitySlider?.value || miniOpacitySlider?.value || 92) / 100);
window.fishDesk.updateShortcuts(settings.shortcuts);
window.fishDesk.updateDisguiseSettings(settings.disguise);
refreshAudioOutputSnapshot();
showHome();

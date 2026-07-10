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

const DOUYIN_URL = "https://www.douyin.com";
const BROWSER_ZOOM = 0.86;
const MINI_ZOOM = 0.62;

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
let isMiniMode = false;
let settings = loadSettings();

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("fishDeskSettings") || "{}");
    const savedShortcuts = saved.shortcuts || {};
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

function applyWebviewZoom() {
  if (!contentView || !contentView.getWebContentsId) return;

  const zoomFactor = isMiniMode ? MINI_ZOOM : BROWSER_ZOOM;

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

async function setMiniMode(enabled) {
  const nextState = await window.fishDesk.setMiniMode(Boolean(enabled));
  isMiniMode = Boolean(nextState);
  renderMiniMode();
  applyWebviewZoom();
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
  contentView.src = currentUrl;
  setActiveLink(currentUrl);
  applyWebviewZoom();
}

function showHome() {
  currentUrl = "";
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
  shortcutHelp.textContent = "\u9690\u85cf\uff1aAlt+1\uff1b\u663e\u793a\uff1aAlt+2\uff1b\u9000\u51fa\uff1aAlt+\u00b7\u3002";
}

function fillSettingsForm() {
  shortcutHide.value = settings.shortcuts.hide;
  shortcutShow.value = settings.shortcuts.show;
  if (shortcutMini) shortcutMini.value = settings.shortcuts.mini;
  shortcutQuit.value = settings.shortcuts.quit;
  fontSizeSelect.value = settings.fontSize;
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

contentView.addEventListener("did-fail-load", () => {
  fallbackNotice.hidden = false;
});

contentView.addEventListener("dom-ready", () => {
  fallbackNotice.hidden = true;
  applyWebviewZoom();
});

window.addEventListener("keydown", (event) => {
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
  applyWebviewZoom();
});

window.fishDesk.onWindowStateChanged?.((state) => {
  updateMaximizeButton(Boolean(state?.isFullScreen || state?.isMaximized));
  if (typeof state?.isMiniMode === "boolean") {
    isMiniMode = state.isMiniMode;
    renderMiniMode();
    applyWebviewZoom();
  }
});

renderToday();
applySettings();
renderMiniMode();
syncOpacityControls(opacitySlider?.value || miniOpacitySlider?.value || 92);
window.fishDesk.setOpacity(Number(opacitySlider?.value || miniOpacitySlider?.value || 92) / 100);
window.fishDesk.updateShortcuts(settings.shortcuts);
showHome();

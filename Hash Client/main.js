import { app, BrowserWindow, ipcMain, webContents, session, powerSaveBlocker } from 'electron';

import path from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let playbackPowerSaveId = null;
let savedWindowBackground = '#FF000000';

function sendPlayerInputClick(targetContents, x, y) {
  const px = Math.round(x);
  const py = Math.round(y);
  targetContents.sendInputEvent({ type: 'mouseMove', x: px, y: py });
  setTimeout(() => {
    targetContents.sendInputEvent({ type: 'mouseDown', x: px, y: py, button: 'left', clickCount: 1 });
    setTimeout(() => {
      targetContents.sendInputEvent({ type: 'mouseUp', x: px, y: py, button: 'left', clickCount: 1 });
    }, 50);
  }, 30);
}

function focusShellWindow() {
  if (!mainWindow) return;
  mainWindow.focus();
  mainWindow.webContents.focus();
}

function sendHardwareClick() {
  if (!mainWindow) return;
  const bounds = mainWindow.getContentBounds();
  const centerX = Math.round(bounds.width / 2);
  const centerY = Math.round(bounds.height / 2);

  mainWindow.webContents.sendInputEvent({ type: 'mouseMove', x: centerX, y: centerY });
  mainWindow.webContents.sendInputEvent({
    type: 'mouseDown',
    x: centerX,
    y: centerY,
    button: 'left',
    clickCount: 1,
  });

  setTimeout(() => {
    if (!mainWindow) return;
    mainWindow.webContents.sendInputEvent({
      type: 'mouseUp',
      x: centerX,
      y: centerY,
      button: 'left',
      clickCount: 1,
    });
  }, 50);
}

function createWindow() {
  console.log('[Electron] Creating Main Window...');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    backgroundColor: '#FF000000',
    webPreferences: {
      webSecurity: false,
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false,
      webviewTag: true,
    },
  });

  const url = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  mainWindow.loadURL(url);

  mainWindow.webContents.on('console-message', (event, level, message) => {
    console.log(`[Renderer] ${message}`);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url: openUrl }) => {
    console.warn(`[Electron Blocker] BLOCKED window open to: ${openUrl}`);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  session.defaultSession.webRequest.onBeforeSendHeaders(
    {
      urls: [
        '*://*.tropicalforesty.uk/*',
        '*://*.videasy.to/*',
        '*://*.videasy.net/*',
        '*://*.cineby.vg/*',
      ],
    },
    (details, callback) => {
      details.requestHeaders['Referer'] = 'https://player.videasy.to/';
      details.requestHeaders['Origin'] = 'https://player.videasy.to';
      callback({ requestHeaders: details.requestHeaders });
    },
  );
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ── Player shell (background transparency) ──────────────────────────

ipcMain.on('player-shell-enter', () => {
  if (!mainWindow) return;
  savedWindowBackground = mainWindow.getBackgroundColor?.() || '#FF000000';
  mainWindow.setBackgroundColor('#00000000');
  focusShellWindow();
});

ipcMain.on('player-shell-exit', () => {
  if (!mainWindow) return;
  mainWindow.setBackgroundColor(savedWindowBackground || '#FF000000');
});

ipcMain.on('player-shell-focus', () => {
  focusShellWindow();
});

// ── Webview input forwarding ────────────────────────────────────────

ipcMain.on('force-webview-click', (event, webviewContentsId, cx, cy) => {
  const targetContents = webContents.fromId(webviewContentsId);
  if (!targetContents) return;
  sendPlayerInputClick(targetContents, cx, cy);
});

ipcMain.on('force-webview-click-at', (event, webviewContentsId, cx, cy) => {
  const targetContents = webContents.fromId(webviewContentsId);
  if (!targetContents) return;
  sendPlayerInputClick(targetContents, cx, cy);
});

ipcMain.on('force-webview-mousemove', (event, webviewContentsId, cx, cy) => {
  const targetContents = webContents.fromId(webviewContentsId);
  if (!targetContents) return;
  targetContents.sendInputEvent({
    type: 'mouseMove',
    x: Math.round(cx),
    y: Math.round(cy),
  });
});

ipcMain.on('send-webview-key', (event, webviewContentsId, keyCode) => {
  const targetContents = webContents.fromId(webviewContentsId);
  if (!targetContents) return;
  targetContents.sendInputEvent({ type: 'keyDown', keyCode });
  targetContents.sendInputEvent({ type: 'char', keyCode });
  targetContents.sendInputEvent({ type: 'keyUp', keyCode });
});

// ── Misc ────────────────────────────────────────────────────────────

ipcMain.on('force-hardware-click', () => {
  sendHardwareClick();
});

ipcMain.on('force-center-click', () => {
  sendHardwareClick();
});

ipcMain.on('playback-power-save-start', () => {
  if (playbackPowerSaveId !== null && powerSaveBlocker.isStarted(playbackPowerSaveId)) return;
  playbackPowerSaveId = powerSaveBlocker.start('prevent-display-sleep');
});

ipcMain.on('playback-power-save-stop', () => {
  if (playbackPowerSaveId === null || !powerSaveBlocker.isStarted(playbackPowerSaveId)) return;
  powerSaveBlocker.stop(playbackPowerSaveId);
  playbackPowerSaveId = null;
});

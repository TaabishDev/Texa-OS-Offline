const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let pythonProcess = null;
let tray = null;

function startPythonBackend() {
  console.log('Starting TEXA Python Backend...');
  const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
  const mainPyPath = path.join(__dirname, '..', 'backend', 'main.py');
  
  pythonProcess = spawn(pythonPath, [mainPyPath]);

  pythonProcess.stdout.on('data', (data) => {
    console.log(`[Python stdout]: ${data}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`[Python stderr]: ${data}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`Python backend exited with code ${code}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "TEXA - Trusted Executive Assistant",
    icon: path.join(__dirname, 'icon.png'), // Placeholder or loaded dynamically
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Load the React Web App frontend
  // In development, load localhost. In production, load the built static html.
  const isDev = !app.isPackaged;
  if (isDev) {
    // Vite Dev Server URL (TanStack start defaults to port 3000 or similar)
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// System tray integration (for quick accessibility)
function createTray() {
  tray = new Tray(path.join(__dirname, 'icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Texa OS', click: () => mainWindow.show() },
    { label: 'Hands-free Wake Word ON/OFF', type: 'checkbox', checked: true },
    { type: 'separator' },
    { label: 'Quit', click: () => {
        app.isQuitting = true;
        app.quit();
    }}
  ]);
  tray.setToolTip('TEXA - AI Assistant');
  tray.setContextMenu(contextMenu);
}

app.whenReady().then(() => {
  startPythonBackend();
  createWindow();
  
  // Create system tray icon if helper exists (or skip silently if no icon)
  try {
    createTray();
  } catch(e) {
    console.log("Tray icon not loaded, skipping tray initialization.");
  }
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, and terminate Python backend
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (pythonProcess) {
    console.log('Terminating Python backend...');
    pythonProcess.kill();
  }
});

// IPC communication endpoints from renderer/frontend
ipcMain.handle('get-system-info', () => {
  return {
    platform: process.platform,
    version: app.getVersion(),
    arch: process.arch
  };
});

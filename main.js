const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let mainWindow;
let serverProcess;

function startServer() {
  const nodeExecutable = process.execPath;
  const serverScript = path.join(__dirname, 'server.js');

  serverProcess = spawn(nodeExecutable, [serverScript], {
    cwd: __dirname,
    env: {
      ...process.env,
      PORT: '3000'
    },
    stdio: 'ignore'
  });

  serverProcess.on('error', (error) => {
    console.error('Server launch failed:', error);
  });
}

function createWindow() {
  const iconPath = path.join(__dirname, 'assets', 'student-app-icon.svg');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1000,
    minHeight: 700,
    title: 'School CBT Student',
    backgroundColor: '#f5f3e7',
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: 'hiddenInset',
    icon: iconPath,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true
    }
  });

  mainWindow.loadURL('http://localhost:3000');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

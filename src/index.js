const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const NetworkManager = require('./network/NetworkManager');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow;
let networkManager;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#1a1a1a'
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open the DevTools in development mode
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();
  
  // Initialize network manager
  networkManager = new NetworkManager();
  
  // Set up IPC handlers
  ipcMain.handle('connect', async (event, bootstrapAddress) => {
    try {
      await networkManager.connect(bootstrapAddress);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('disconnect', async () => {
    await networkManager.disconnect();
    return { success: true };
  });
  
  ipcMain.handle('sendMessage', async (event, message) => {
    try {
      await networkManager.broadcast(message);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  // Forward network events to renderer
  networkManager.on('peer-joined', (peerId) => {
    if (mainWindow) mainWindow.webContents.send('peer-joined', peerId);
  });
  
  networkManager.on('peer-left', (peerId) => {
    if (mainWindow) mainWindow.webContents.send('peer-left', peerId);
  });
  
  networkManager.on('message', (data) => {
    if (mainWindow) mainWindow.webContents.send('message', data);
  });
  
  networkManager.on('connected', () => {
    if (mainWindow) mainWindow.webContents.send('connected');
  });
  
  networkManager.on('disconnected', () => {
    if (mainWindow) mainWindow.webContents.send('disconnected');
  });

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (networkManager) {
    networkManager.disconnect();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

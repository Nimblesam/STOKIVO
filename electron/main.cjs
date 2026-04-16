const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (app.isPackaged) {
    // ✅ PRODUCTION (Mac / Windows app)
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  } else {
    // ✅ DEVELOPMENT
    win.loadURL("http://localhost:5173");
  }
}

app.whenReady().then(createWindow);
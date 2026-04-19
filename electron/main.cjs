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

  const isDev = !app.isPackaged;

  if (isDev) {
    win.loadURL("http://localhost:8080"); // Match Vite port
  } else {
    // Ensure the index.html path is correct relative to the packaged app
    const indexPath = path.join(__dirname, "../dist/index.html");
    win.loadFile(indexPath).catch(err => {
      console.error("Failed to load index.html:", err);
    });
  }
}

app.whenReady().then(createWindow);
const { app, BrowserWindow, dialog, shell, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

// Enable live reload for Electron in development
if (process.env.NODE_ENV === "development") {
  try {
    require("electron-reload")(__dirname, {
      electron: path.join(__dirname, "node_modules", ".bin", "electron"),
      hardResetMethod: "exit",
    });
  } catch (e) {
    // electron-reload is optional in development
    console.log("electron-reload not available");
  }
}

let mainWindow;
let splashWindow;

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 560,
    height: 300,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    center: true,
    show: false, // wait until content is ready-to-show
    transparent: false,
    webPreferences: {
      // keep defaults / secure: no node integration for splash
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  splashWindow.removeMenu?.();

  splashWindow.loadFile(path.join(__dirname, "src", "splash.html"));

  // show the splash only once it's ready to display (avoids white flash)
  splashWindow.once("ready-to-show", () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.show();
      // option: in dev show devtools for splash to debug assets
      if (process.env.NODE_ENV === "development") {
        // splashWindow.webContents.openDevTools({ mode: "detach" });
      }
    }
  });

  // prevent splash from creating new windows
  splashWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  // guard: if splash crashes or fails to load, ensure it's cleaned up
  splashWindow.on("closed", () => {
    splashWindow = null;
  });
}

function createWindow() {
  // Create the browser window but do not show it until ready
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    autoHideMenuBar: true,
    show: false, // start hidden
    backgroundColor: "#f8f1ea",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, "preload.js"),
      webSecurity: false, // Allow local file access for development
    },
    icon: path.join(__dirname, "assets", "icon.png"),
    title: "GrooveScribe Desktop",
  });

  // Load the HTML file
  mainWindow.loadFile(path.join(__dirname, "src", "index.html"));

  // Open DevTools in development
  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }

  // Show window when ready and close splash
  const showMainAndCloseSplash = () => {
    // If splash exists but hasn't become visible yet, wait a short time
    if (splashWindow && !splashWindow.isDestroyed()) {
      if (!splashWindow.isVisible()) {
        // wait for splash to become visible to avoid white flash
        setTimeout(showMainAndCloseSplash, 50);
        return;
      }
      try {
        splashWindow.close();
      } catch (e) {}
      splashWindow = null;
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  };

  // Prefer ready-to-show to display the main window when content is ready
  mainWindow.once("ready-to-show", () => {
    showMainAndCloseSplash();
  });

  // Fallback: when renderer finished loading
  mainWindow.webContents.once("did-finish-load", () => {
    // slight delay to avoid flicker if needed
    setTimeout(showMainAndCloseSplash, 150);
  });

  // Handle window closed
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

// IPC handlers for file operations
ipcMain.handle("save-groove-dialog", async (event, data) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: "GrooveScribe Files", extensions: ["gscribe"] },
      { name: "JSON Files", extensions: ["json"] },
      { name: "All Files", extensions: ["*"] },
    ],
    defaultPath: "untitled-groove.gscribe",
  });

  if (!result.canceled) {
    try {
      fs.writeFileSync(result.filePath, data);
      return { success: true, filePath: result.filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, canceled: true };
});

ipcMain.handle("export-file-dialog", async (event, data, fileType) => {
  const filters = {
    midi: [{ name: "MIDI Files", extensions: ["mid", "midi"] }],
    png: [{ name: "PNG Images", extensions: ["png"] }],
    svg: [{ name: "SVG Images", extensions: ["svg"] }],
  };

  const result = await dialog.showSaveDialog(mainWindow, {
    filters: filters[fileType] || [{ name: "All Files", extensions: ["*"] }],
    defaultPath: `groove.${fileType}`,
  });

  if (!result.canceled) {
    try {
      fs.writeFileSync(result.filePath, data);
      return { success: true, filePath: result.filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, canceled: true };
});

// App event handlers
app.whenReady().then(() => {
  createSplash();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createSplash();
    createWindow();
  }
});

// Security: Prevent new window creation
app.on("web-contents-created", (event, contents) => {
  contents.on("new-window", (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });
});

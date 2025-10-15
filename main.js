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

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, "preload.js"),
      webSecurity: false, // Allow local file access for development
    },
    icon: path.join(__dirname, "assets", "icon.png"), // Add icon later
    title: "GrooveScribe Desktop",
  });

  // Load the HTML file
  mainWindow.loadFile("src/index.html");

  // Open DevTools in development
  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }

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
app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
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

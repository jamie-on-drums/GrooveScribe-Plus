const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // File operations
    saveGroove: (data) => ipcRenderer.invoke('save-groove-dialog', data),
    exportFile: (data, fileType) => ipcRenderer.invoke('export-file-dialog', data, fileType),
    
    // Menu event listeners
    onMenuNewGroove: (callback) => ipcRenderer.on('menu-new-groove', callback),
    onMenuOpenGroove: (callback) => ipcRenderer.on('menu-open-groove', callback),
    onMenuSaveGroove: (callback) => ipcRenderer.on('menu-save-groove', callback),
    onMenuSaveGrooveAs: (callback) => ipcRenderer.on('menu-save-groove-as', callback),
    onMenuExportMidi: (callback) => ipcRenderer.on('menu-export-midi', callback),
    onMenuExportPng: (callback) => ipcRenderer.on('menu-export-png', callback),
    onMenuExportSvg: (callback) => ipcRenderer.on('menu-export-svg', callback),
    onMenuUndo: (callback) => ipcRenderer.on('menu-undo', callback),
    onMenuRedo: (callback) => ipcRenderer.on('menu-redo', callback),
    onMenuClearAll: (callback) => ipcRenderer.on('menu-clear-all', callback),
    onMenuPlayPause: (callback) => ipcRenderer.on('menu-play-pause', callback),
    onMenuStop: (callback) => ipcRenderer.on('menu-stop', callback),
    onMenuToggleMetronome: (callback) => ipcRenderer.on('menu-toggle-metronome', callback),
    
    // Remove listeners
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
    
    // Platform info
    platform: process.platform,
    
    // Development helpers
    isDevelopment: process.env.NODE_ENV === 'development'
});
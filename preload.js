const os = require('os');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('dialog', {
    showOpenDialog: (options) => ipcRenderer.invoke('showOpenDialog', options)
});

contextBridge.exposeInMainWorld('shell', {
    openExternal: (...args) => shell.openExternal(...args)
});

contextBridge.exposeInMainWorld('url', {
    fileURLToPath: (...args) => url.fileURLToPath(...args)
});

contextBridge.exposeInMainWorld('os', {
    homedir: () => os.homedir()
})

contextBridge.exposeInMainWorld('path', {
    join: (...args) => path.join(...args),
    dirname: (...args) => path.dirname(...args)
})

contextBridge.exposeInMainWorld('electron', {
    getAppPath: () => ipcRenderer.invoke('get-app-path'),
});

contextBridge.exposeInMainWorld('fs', {
    readFileSync: (...args) => fs.readFileSync(...args),
    appendFile: (...args) => fs.appendFile(...args),
    writeFile: (...args) => fs.writeFile(...args),
    writeFileSync: (...args) => fs.writeFileSync(...args),
    existsSync: (...args) => fs.existsSync(...args),
    statSync: (...args) => fs.statSync(...args),
    mkdir: (...args) => fs.mkdir(...args),
    copyFile: (...args) => fs.copyFile(...args)
})

contextBridge.exposeInMainWorld('ipcRenderer', {
    send: (...args) => ipcRenderer.send(...args),
    on: (...args) => ipcRenderer.on(...args),
    once: (...args) => ipcRenderer.once(...args),
})

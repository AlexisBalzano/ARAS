const path = require('path')
const { BrowserWindow, Menu } = require('electron');
const { ipcMain, dialog, app } = require('electron');

process.env.NODE_ENV = 'production';

const isDev = process.env.NODE_ENV !== 'production';
const isMac = process.platform === 'darwin';

require('electron-reload')(__dirname, {
    // Optional: Use Electron's built-in hard reset to reload the whole app (not just the renderer process)
    electron: require(`${__dirname}/node_modules/electron`)
});


let mainWindow;

// Create the main window
function createMainWindow() {
    mainWindow = new BrowserWindow({
        resizable: false,
        frame: false,
        title: 'Automatic Runway Assisgnement System',
        width: isDev ? 1000 : 600,
        height: 500,
        icon: path.join(__dirname, 'build-assets/icon.png'),
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    
    //Open devtolls if in dev env
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }
    
    mainWindow.loadFile(path.join(__dirname, './renderer/index.html'));
}

// Create Setting window
function createSettingWindow() {
    const settingWindow = new BrowserWindow({
        resizable: false,
        title: 'SETTING',
        icon: path.join(__dirname, 'build-assets/setting.png'),
        width: 600,
        height: 500,
    });
    
    settingWindow.setMenuBarVisibility(null);
    settingWindow.setAlwaysOnTop(true);
    settingWindow.loadFile(path.join(__dirname, './renderer/setting.html'));
}


// App is ready
app.whenReady().then(() => {
    createMainWindow();

    //Implement menu
    const mainMenu = Menu.buildFromTemplate(menu);
    Menu.setApplicationMenu(mainMenu)
    
    ipcMain.on('minimize-window', () => mainWindow.minimize());

    ipcMain.on('close-window', () => mainWindow.close());

    //Remove mainWindow from memory on close
    mainWindow.on('closed', () => (mainWindow = null));

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    })
});

// Menu Template
const menu = [
    ...(isMac ? [{
        label: app.name,
    }] : []),
    {
        label: 'File',
        submenu: [
            {
                label: 'Setting',
                click: createSettingWindow,
                accelerator: 'CmdOrCtrl+P'
            },
            {
                label: 'Quit',
                accelerator: 'CmdOrCtrl+W',
                click: () => app.quit()
            }
        ]
    }
]


app.on('window-all-closed', () => {
    if (!isMac) {
        app.quit();
    }
});


ipcMain.handle('showOpenDialog', async (event, options) => {
    const result = await dialog.showOpenDialog(options);
    return result;
});

ipcMain.handle('get-app-path', () => {
    return app.getAppPath();
});
const path = require('path')
const { BrowserWindow, Menu } = require('electron');
const { ipcMain, dialog, app } = require('electron');
const fs = require('fs');

// process.env.NODE_ENV = 'production';
isPackaged = false;

const isDev = process.env.NODE_ENV !== 'production';
const isMac = process.platform === 'darwin';


require('electron-reload')(__dirname, {
    // Optional: Use Electron's built-in hard reset to reload the whole app (not just the renderer process)
    electron: require(`${__dirname}/node_modules/electron`),
    ignored: /config|.*\.rwy/
});

const appPath = app.getAppPath();
let userPreferencePath;
let coordinates;


coordinates = [450, 350];
userPreferencePath = path.join(appPath, 'config', 'userPreference.json');
coordinates = JSON.parse(fs.readFileSync(userPreferencePath, 'utf8')).coordinates;


if(coordinates === undefined) {
    coordinates = [450, 350]
}

let mainWindow;

// Create the main window
function createMainWindow() {


    mainWindow = new BrowserWindow({
        x: coordinates[0],
        y: coordinates[1],
        resizable: false,
        frame: false,
        title: 'Automatic Runway Assisgnement System',
        width: isDev ? 1000 : 600,
        height: 400,
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

let settingWindow;
// Create Setting window
function createSettingWindow() {
    if(settingWindow) {
        settingWindow.restore();
        return;
    }

    settingWindow = new BrowserWindow({
        resizable: false,
        title: 'SETTING',
        icon: path.join(__dirname, 'build-assets/setting.png'),
        width: 600,
        height: 500,
    });
    
    settingWindow.setMenuBarVisibility(null);
    settingWindow.setAlwaysOnTop(true);
    settingWindow.loadFile(path.join(__dirname, './renderer/setting.html'));

    settingWindow.on('closed', () => {
        settingWindow = null;
    })
}


// App is ready
app.whenReady().then(() => {
    createMainWindow();

    ipcMain.on('minimize-window', () => mainWindow.minimize());

    ipcMain.on('close-window', () => mainWindow.close());

    ipcMain.on('open-settings-window', () => {
        createSettingWindow();
    });

    //Remove mainWindow from memory on close
    mainWindow.on('closed', () => (mainWindow = null));
    
    mainWindow.on('moved', () => {
        let coordo = mainWindow.getPosition();
        let userPreference = JSON.parse(fs.readFileSync(userPreferencePath, 'utf8'));
        userPreference.coordinates = coordo;
        fs.writeFileSync(userPreferencePath, JSON.stringify(userPreference));
    });
    

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    })
});


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

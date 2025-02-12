require('v8-compile-cache');

const path = require('path')
const { BrowserWindow, ipcMain, dialog, app } = require('electron');
const fs = require('fs');

process.env.NODE_ENV = 'production';
isPackaged = true;

const isDev = process.env.NODE_ENV !== 'production';
const isMac = process.platform === 'darwin';


// require('electron-reload')(__dirname, {
//     // Optional: Use Electron's built-in hard reset to reload the whole app (not just the renderer process)
//     electron: require(`${__dirname}/node_modules/electron`),
//     ignored: /config|.*\.rwy/
// });

const appPath = app.getAppPath();

let statusChecked = false;
let userPreferencePath;
let mainCoordinates;
let settingCoordinates;


function getCoordinates(key) {
    let defaultCoordinates = [450, 350];
    if(isPackaged) {
        userPreferencePath = path.join(appPath, '..', 'config', 'userPreference.json');
    } else {
        userPreferencePath = path.join(appPath, 'config', 'userPreference.json');
    }
    let coordinates;
    try {
        coordinates = JSON.parse(fs.readFileSync(userPreferencePath, 'utf8'))[key];
    } catch(err) {
        console.log(err);
    }
    if(coordinates === undefined) {
        coordinates = defaultCoordinates;
    }
    return coordinates;
}




let splashWindow;
function createSplashWindow(width, height) {
    splashWindow = new BrowserWindow({
        width: width,
        height: height,
        resizable: false,
        frame: false,
        show: true,
        alwaysOnTop: true,
        transparent: true,
        title: 'Splash Screen',
        icon: path.join(__dirname, './build-assets/icon.png'),
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    splashWindow.loadFile(path.join(__dirname, './renderer/html/splash.html'));
}

let mainWindow;

// Create the main window
function createMainWindow() {
    mainCoordinates = getCoordinates('mainCoordinates');

    mainWindow = new BrowserWindow({
        x: mainCoordinates[0],
        y: mainCoordinates[1],
        resizable: false,
        frame: false,
        title: 'Automatic Runway Assisgnement System',
        width: isDev ? 1000 : 600,
        height: 400,
        show: false,
        icon: path.join(__dirname, './build-assets/icon.png'),
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
    
    mainWindow.loadFile(path.join(__dirname, './renderer/html/index.html'));
    
    //Remove mainWindow from memory on close
    mainWindow.on('closed', () => {
        mainWindow = null
        if(settingWindow) {
            settingWindow.close();
        }
    });
    mainWindow.on('moved', () => {
        let coordo = mainWindow.getPosition();
        let userPreference = JSON.parse(fs.readFileSync(userPreferencePath, 'utf8'));
        userPreference.mainCoordinates = coordo;
        fs.writeFileSync(userPreferencePath, JSON.stringify(userPreference));
    });
}

let settingWindow;
// Create Setting window
function createSettingWindow() {
    if(settingWindow) {
        settingWindow.restore();
        return;
    }

    settingCoordinates =  getCoordinates('settingCoordinates');

    settingWindow = new BrowserWindow({
        x: settingCoordinates[0],
        y: settingCoordinates[1],
        resizable: false,
        frame: false,
        title: 'SETTING',
        icon: path.join(__dirname, './build-assets/setting.png'),
        width: isDev? 1000: 600,
        height: 500,
        show: true,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });
    
    if (isDev) {
        settingWindow.webContents.openDevTools();
    }

    settingWindow.setMenuBarVisibility(null);
    settingWindow.setAlwaysOnTop(true);
    settingWindow.loadFile(path.join(__dirname, './renderer/html/setting.html'));
    settingWindow.on('closed', () => (settingWindow = null));
    settingWindow.on('moved', () => {
        let coordo = settingWindow.getPosition();
        let userPreference = JSON.parse(fs.readFileSync(userPreferencePath, 'utf8'));
        userPreference["settingCoordinates"] = coordo;
        fs.writeFileSync(userPreferencePath, JSON.stringify(userPreference));
    });
    
}

let userClosed = true;

function showMainWindow() {
    userClosed = false;
    splashWindow.destroy();
    if(statusChecked) {
        mainWindow.show();
        return;
    }
    let errorWindow = new BrowserWindow({
        width: 600,
        height: 400,
        resizable: false,
        frame: false,
        show: true,
        alwaysOnTop: true,
        title: 'Error Screen',
        icon: path.join(__dirname, './build-assets/icon.png'),
    });

    errorWindow.loadFile(path.join(__dirname, './renderer/html/error.html'));
}

// App is ready
app.on('ready', () => {
    createMainWindow();
    createSplashWindow(600, 400);
    
    splashWindow.on('closed', () => {
        if(userClosed) {
            app.quit();
        };
    });

    ipcMain.on('minimize-main-window', () => mainWindow.minimize());

    ipcMain.on('close-main-window', () => mainWindow.close());
    
    ipcMain.on('minimize-setting-window', () => settingWindow.minimize());

    ipcMain.on('close-setting-window', () => settingWindow.close());

    ipcMain.on('open-settings-window', () => {
        createSettingWindow();
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

ipcMain.on('request-rwypath', () => {
    mainWindow.webContents.send('request-rwypath');
});

ipcMain.on('send-rwypath', (event, path) => {
    settingWindow.webContents.send('send-rwypath', path);
});

ipcMain.on('status-checked', () => {
    statusChecked = true;
    setTimeout(() => {
        if (isDev) {
            if(mainWindow.webContents.isDevToolsOpened()) {
                showMainWindow()
            } else {
                mainWindow.webContents.on('devtools-opened', () => {
                    showMainWindow();
                });
            }
        } else {
            showMainWindow();
        }
    }, 1500);
});


setTimeout(() => {
    if (!statusChecked) {
        showMainWindow();
    }
}, 6000);

let imagePath = path.join(__dirname, '../build-assets/icon.png');

ipcMain.on('get-image-path', (event) => {
    event.sender.send('image-path', imagePath);
});
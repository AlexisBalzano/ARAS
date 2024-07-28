export async function assignPaths(filename, isPackaged) {
    const appPath = await window.electron.getAppPath();
    if(isPackaged) {
        return path.join(os.homedir(), 'Documents', 'ARAS', filename);
    } else {
        return path.join(appPath, 'config', filename);   
    }
}

export async function assignUserPreferencePaths(isPackaged) {
    const appPath = await window.electron.getAppPath();
    if(isPackaged) {
        return path.join(path.join(appPath, '..', 'config', 'userPreference.json'));
    } else {
        return path.join(appPath, 'config', 'userPreference.json');   
    }
}
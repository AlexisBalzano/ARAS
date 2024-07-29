import { showNotif } from './notification.js';
import { openReadme } from './fileManager.js';

const rwydataIndicator = document.getElementById('rwydata');
const configIndicator = document.getElementById('config');
const rwyFileButton = document.getElementById('rwyButton')


let isPackaged = true;

export function setPathPackagedState(windowIsPackaged) {
    isPackaged = windowIsPackaged;
}

async function assignPaths(filename) {
    const appPath = await window.electron.getAppPath();
    if(isPackaged) {
        return path.join(os.homedir(), 'Documents', 'ARAS', filename);
    } else {
        return path.join(appPath, 'config', filename);   
    }
}

async function assignUserPreferencePaths() {
    const appPath = await window.electron.getAppPath();
    if(isPackaged) {
        return path.join(path.join(appPath, '..', 'config', 'userPreference.json'));
    } else {
        return path.join(appPath, 'config', 'userPreference.json');   
    }
}

export async function pathAssignement(paths, tokenValid, createDefaultConfig) {
    // Get the path to the resources directory

    paths.rwyPath = await assignPaths('rwydata.json');
    paths.configPath = await assignPaths('config.json');
    let userPreferencePath = await assignUserPreferencePaths();


    if (!fs.existsSync(userPreferencePath)) {
        showNotif({type:'failure', message:'User preference not found, please reinstall app', duration:0});
        return;
    }

    let userPreference;
    try {
        userPreference = JSON.parse(fs.readFileSync(userPreferencePath, 'utf8'));
    } catch(error) {
        showNotif({type:'failure', message:'User Preference corrupted, please reinstall app', duration:0});
        return;
    }
    
    if (userPreference.isFirstStartUp) {
        showNotif({type:'processing', message:'First startup detected, creating default config...', duration:3000});
        fs.mkdir(path.join(os.homedir(), 'Documents', 'ARAS'), {recursive: true}, (err) => {
            if (err) {
                console.error(err);
                return;
            }
        });
        
        createDefaultConfig(paths.configPath);
        
        let tempPath = await window.electron.getAppPath();
        fs.copyFile(path.join(tempPath, '..', 'config', 'rwydata.json'), path.join(os.homedir(), 'Documents', 'ARAS', 'rwydata.json'), (err) => {
            if (err) {
                console.error(err);
                return;
            }
            userPreference.isFirstStartUp = false;
            fs.writeFileSync(userPreferencePath, JSON.stringify(userPreference, null, 2));
            checkStatus(paths, tokenValid, createDefaultConfig);
            return;
        });
        setTimeout(() => {
            openReadme();
        }, 2000);
    } else {
        checkStatus(paths, tokenValid, createDefaultConfig);
    }
};

function checkStatus(paths, tokenValid, createDefaultConfig) {
    if (fs.existsSync(paths.configPath)) {
        configIndicator.style.color = 'var(--green)';
        configIndicator.title = "config.json found";
        tokenValid(paths.configPath);
        if (JSON.parse(fs.readFileSync(paths.configPath, 'utf8')).outputPath !== null) {
            rwyFileButton.style.backgroundColor = 'var(--green)';
            rwyFileButton.innerText = 'Using previous file location';
        }
    } else {
        showNotif({type: 'failure', message: 'Config.json not found', duration: 1500});
        createDefaultConfig(paths.configPath)
        showNotif({type: 'success', message: 'Default Config.json created', duration: 1500});
        
    }
    // Check if rwydata.json is detected
    if (fs.existsSync(paths.rwyPath)) {
        rwydataIndicator.style.color = 'var(--green)';
        rwydataIndicator.title = "rwydata.json found";
    } else {
        showNotif({type: 'failure', message: 'rwydata.json not found', duration: 1500});
    }
}
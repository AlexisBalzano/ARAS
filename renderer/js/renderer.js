import { showNotif, clearNotif } from "./notification.js";
import { ARAS as ARASimport } from "./RWYassignement.js";
import { assignPaths, assignUserPreferencePaths } from "./pathAssignement.js";

const rwyFileButton = document.querySelector('#rwyButton')
const rwydataIndicator = document.querySelector('#rwydata');
const configIndicator = document.querySelector('#config');
const tokenStatus = document.querySelector('#tokenStatus');
const APItoken = document.querySelector('#APItoken');
const FIRselect = document.querySelector('#FIRselect');
const airportSelect = document.querySelector('#airportSelect');
const resetButton = document.querySelector('#resetButton');


let isPackaged = false;

let rwyPath;         //Runway data json file
let configPath;      //Settings preference json file


window.openReadme = async function() {
    let readmePath;
    if (!isPackaged) {
        const currentDir = path.dirname(url.fileURLToPath(window.location.href));
        readmePath = path.join(currentDir, '..', 'README.txt');
    } else {
        const appPath = await window.electron.getAppPath();
        readmePath = path.join(appPath, '..', 'ReadMe.txt');
    }
    window.shell.openExternal(`file://${readmePath}`);
}

function createDefaultConfig(configPath){
    const defaultConfig = {
        "apitoken": null,
        "outputPath": null,
        "FIRairports": {
            "LFFF": [
                "LFPO",
                "LFPG",
                "LFPB",
                "LFOB",
                "LFQQ"
            ],
            "LFBB": [
                "LFBO",
                "LFBD",
                "LFBH",
                "LFBZ"
            ],
            "LFMM": [
                "LFML",
                "LFMN",
                "LFMP",
                "LFML",
                "LFKB",
                "LFKJ",
                "LFLL",
                "LFMT"
            ],
            "has4runways": [
                "LFPG"
            ]
        },
        "tokenValidity": false
    }

    fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2), (err) => {
        if (err) {
            console.error(err);
            return;
        }
    });
    pathAssignement();
}





async function tokenValid(configPath) {
    let data = fs.readFileSync(configPath, 'utf8');
    let token = JSON.parse(data).apitoken;
    if (token !== null && token !== '') {
        tokenStatus.style.color = 'yellow';
        tokenStatus.title = "API token found but not verified";
        APItoken.placeholder = token;
        if (JSON.parse(fs.readFileSync(configPath, 'utf8')).tokenValidity) {
            tokenStatus.style.color = 'var(--green)';
            tokenStatus.title = "API token found and verified";
        }
        return;
    }
    APItoken.placeholder = 'Enter API token';
}

async function pathAssignement() {
    // Get the path to the resources directory

    rwyPath = await assignPaths('rwydata.json', isPackaged);
    configPath = await assignPaths('config.json', isPackaged);
    let userPreferencePath = await assignUserPreferencePaths(isPackaged);

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
        showNotif({type:'processing', message:'First startup detected, creating default config...', duration:1500});
        if (!fs.existsSync(path.join(configPath, '..'))) {
            fs.mkdir(path.join(configPath, '..'), (err) => {
                if (err) {
                    console.error(err);
                    return;
                }
            });
        }
        
        createDefaultConfig(configPath);
        
        tempPath = await window.electron.getAppPath();
        fs.copyFile( path.join(tempPath, '..', 'config', 'rwydata.json'), path.join(rwyPath, '..', 'rwydata.json'), (err) => {
            if (err) {
                console.error(err);
                return;
            }
        });
        userPreference.isFirstStartUp = false;
        fs.writeFileSync(userPreferencePath, JSON.stringify(userPreference, null, 2));
    } else {
        // Check if config.json is detected
        if (fs.existsSync(configPath)) {
            configIndicator.style.color = 'var(--green)';
            configIndicator.title = "config.json foudn";
            tokenValid(configPath);
            if (JSON.parse(fs.readFileSync(configPath, 'utf8')).outputPath !== null) {
                rwyFileButton.style.backgroundColor = 'var(--green)';
                rwyFileButton.innerText = 'Using previous file location';
            }
        } else {
            showNotif({type: 'failure', message: 'Config.json not found', duration: 1500});
            createDefaultConfig(configPath)
            showNotif({type: 'success', message: 'Default Config.json created', duration: 1500});
            
        }
        // Check if rwydata.json is detected
        if (fs.existsSync(rwyPath)) {
            rwydataIndicator.style.color = 'var(--green)';
            rwydataIndicator.title = "rwydata.json found";
        } else {
            showNotif({type: 'failure', message: 'rwydata.json not found', duration: 1500});
        }
    }
};

function populateAiportsList(FIR) {
    airportsList = JSON.parse(fs.readFileSync(configPath, 'utf8')).FIRairports[FIR];
    airportSelect.value = airportsList.join(', ');
}

window.onload = async function () {
    await pathAssignement();
    setTimeout(() => {
    populateAiportsList('LFFF');
    }, 1000);
};



window.loadRwyfile = function () {
    window.dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{
            name: 'Runway file',
            extensions: ['rwy']
        }]
    }).then(result => {
        if (!result.canceled) {
            const file = result.filePaths[0];
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            config.outputPath = file;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            rwyFileButton.style.backgroundColor = 'green';
            rwyFileButton.innerText = '.rwy file selected';
        }
    }).catch(err => {
        console.log(err);
    });
}

window.ARAS = async function (FIR) {
    ARASimport(FIR, configPath, rwyPath, showNotif, clearNotif, createDefaultConfig, tokenValid, fs);
}


let FIR = 'LFFF'
let airportsList = []

function FIRconfigUpdater(FIR, airportsList) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    config.FIRairports[FIR] = airportsList;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

//Listeners

APItoken.addEventListener('change', () => {
    const token = APItoken.value;
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    config.apitoken = token;
    config.tokenValidity = false;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    let notif1 = showNotif({type: 'success', message: 'API token saved', duration: 0});
    setTimeout(() => {
        clearNotif(notif1);
    }, 1500);
    tokenValid(configPath);
})

FIRselect.addEventListener('change', () => {
    FIR = FIRselect.value;
    populateAiportsList(FIRselect.value);
})

airportSelect.addEventListener('change', () => {
    const airport = airportSelect.value;
    if(airport === '') {
        showNotif({type: 'failure', message: 'No airport entered', duration: 1500});
        return;
    }
    airportsList = airport.split(',').map(item => item.trim()).filter(item => item !== '');
    FIRconfigUpdater(FIR, airportsList);
    showNotif({type: 'success', message: FIR + ' airports updated', duration: 1500});
})

resetButton.addEventListener('click', () => {
    airportsList = [];
    if (FIR === 'LFFF') {
        airportsList = ['LFPO', 'LFPG', 'LFPB', 'LFOB', 'LFQQ'];
    } else if (FIR === 'LFBB') {
        airportsList = ['LFBO', 'LFBD', 'LFBH', 'LFBZ'];
    } else if (FIR === 'LFMM') {
        airportsList = ['LFML', 'LFMN', 'LFMP', 'LFML', 'LFKB', 'LFKJ', 'LFLL', 'LFMT'];
    } else if (FIR === 'has4runways') {
        airportsList = ['LFPG'];
    }
    FIRconfigUpdater(FIR, airportsList);
    showNotif({type: 'success', message: FIR + ' airports reset', duration: 1500});
    populateAiportsList(FIR);
})

document.getElementById('minimize-window').addEventListener('click', () => {
    ipcRenderer.send('minimize-window');
});

document.getElementById('close-window').addEventListener('click', () => {
    ipcRenderer.send('close-window');
});


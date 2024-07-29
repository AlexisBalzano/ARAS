import { showNotif, clearNotif } from "./notification.js";
import { ARAS as ARASimport } from "./RWYassignement.js";
import { pathAssignement, setPathPackagedState } from "./pathAssignement.js";
import { createDefaultConfig, tokenValid, openReadme, setPackageState } from "./fileManager.js";
import { FIRconfigUpdater, populateAiportsList } from "./DataManager.js";

const rwyFileButton = document.getElementById('rwyButton')
const APItoken = document.getElementById('APItoken');
const FIRselect = document.getElementById('FIRselect');
const airportSelect = document.getElementById('airportSelect');
const resetButton = document.getElementById('resetButton');



let isPackaged = false;

setPackageState(isPackaged);
setPathPackagedState(isPackaged);


let paths = {
    rwyPath: null,
    configPath: null
}

window.openReadme = openReadme;


window.onload = async function () {
    await pathAssignement(paths, tokenValid, createDefaultConfig, showNotif);
    setTimeout(() => {
    populateAiportsList('LFFF', paths);
    }, 1000);
    ipcRenderer.send('status-checked');
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
            const config = JSON.parse(fs.readFileSync(paths.configPath, 'utf8'));
            config.outputPath = file;
            fs.writeFileSync(paths.configPath, JSON.stringify(config, null, 2));
            rwyFileButton.style.backgroundColor = 'green';
            rwyFileButton.innerText = '.rwy file selected';
        }
    }).catch(err => {
        console.log(err);
    });
}


window.ARAS = async function (FIR) {
    ARASimport(FIR, paths, showNotif, clearNotif, createDefaultConfig, tokenValid, fs);
}






//Listeners
APItoken.addEventListener('change', () => {
    const token = APItoken.value;
    const config = JSON.parse(fs.readFileSync(paths.configPath, 'utf8'));
    config.apitoken = token;
    config.tokenValidity = false;
    fs.writeFileSync(paths.configPath, JSON.stringify(config, null, 2));
    let notif1 = showNotif({type: 'success', message: 'API token saved', duration: 0});
    setTimeout(() => {
        clearNotif(notif1);
    }, 1500);
    tokenValid(paths.configPath);
})

let FIR = 'LFFF';
FIRselect.addEventListener('change', () => {
    FIR = FIRselect.value;
    populateAiportsList(FIRselect.value, paths);
})

airportSelect.addEventListener('change', () => {
    const airport = airportSelect.value;
    if(airport === '') {
        showNotif({type: 'failure', message: 'No airport entered', duration: 1500});
        return;
    }
    let airportsList = airport.split(',').map(item => item.trim()).filter(item => item !== '');
    FIRconfigUpdater(FIR, airportsList, paths);
    showNotif({type: 'success', message: FIR + ' airports updated', duration: 1500});
})

resetButton.addEventListener('click', () => {
    let airportsList = [];
    if (FIR === 'LFFF') {
        airportsList = ['LFPO', 'LFPG', 'LFPB', 'LFOB', 'LFQQ'];
    } else if (FIR === 'LFBB') {
        airportsList = ['LFBO', 'LFBD', 'LFBH', 'LFBZ'];
    } else if (FIR === 'LFMM') {
        airportsList = ['LFML', 'LFMN', 'LFMP', 'LFML', 'LFKB', 'LFKJ', 'LFLL', 'LFMT'];
    } else if (FIR === 'has4runways') {
        airportsList = ['LFPG'];
    }
    FIRconfigUpdater(FIR, airportsList, paths);
    showNotif({type: 'success', message: FIR + ' airports reset', duration: 1500});
    populateAiportsList(FIR, paths);
})

document.getElementById('minimize-window').addEventListener('click', () => {
    ipcRenderer.send('minimize-main-window');
});

document.getElementById('close-window').addEventListener('click', () => {
    ipcRenderer.send('close-main-window');
});

ipcRenderer.on('request-rwypath', () => {
    if (paths.rwyPath) {
        ipcRenderer.send('send-rwypath', paths.rwyPath);
    } else {
        ipcRenderer.send('send-rwypath', 'NoPath');
    }
});


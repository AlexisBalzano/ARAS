import { showNotif, clearNotif } from "./notification.js";
import { ARAS as ARASimport } from "./RWYassignement.js";
import { pathAssignement, setPathPackagedState } from "./pathAssignement.js";
import { createDefaultConfig, tokenValid, openReadme, setPackageState } from "./fileManager.js";

const rwyFileButton = document.querySelector('#rwyButton')
const APItoken = document.querySelector('#APItoken');
const FIRselect = document.querySelector('#FIRselect');
const airportSelect = document.querySelector('#airportSelect');
const resetButton = document.querySelector('#resetButton');
const tokenStatus = document.querySelector('#tokenStatus');



let isPackaged = false;

setPackageState(isPackaged);
setPathPackagedState(isPackaged);

let paths = {
    rwyPath: null,
    configPath: null
}

window.openReadme = openReadme;

function populateAiportsList(FIR) {
    airportsList = JSON.parse(fs.readFileSync(paths.configPath, 'utf8')).FIRairports[FIR];
    airportSelect.value = airportsList.join(', ');
}

window.onload = async function () {
    await pathAssignement(paths, tokenValid, createDefaultConfig);
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


let FIR = 'LFFF'
let airportsList = []

function FIRconfigUpdater(FIR, airportsList) {
    const config = JSON.parse(fs.readFileSync(paths.configPath, 'utf8'));
    config.FIRairports[FIR] = airportsList;
    fs.writeFileSync(paths.configPath, JSON.stringify(config, null, 2));
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


import { showNotif, clearNotif } from "./notification.js";

const heading1 = document.getElementById('heading');
const preferential1 = document.getElementById('preferential');
const departure1 = document.getElementById('departure');
const arrival1 = document.getElementById('arrival');
const heading2 = document.getElementById('heading2');
const preferential2 = document.getElementById('preferential2');
const departure2 = document.getElementById('departure2');
const arrival2 = document.getElementById('arrival2');
const has4runways = document.getElementById('has4runwaycheck');
const form = document.getElementsByClassName('dataform')[0];

let data;
let rwypath;
let newInput = {};
let isModifiable = false;


form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    data = Object.fromEntries(formData.entries());
    let oaci = data.oaci.toUpperCase();
    if(oaci.length != 4) {
        showNotif({type: 'failure', message: 'OACI code must be 4 characters long', duration: 2000});
        return;
    }
    rwypath = await getRwyPath();
    let rwydata = JSON.parse(fs.readFileSync(rwypath, 'utf8'));
    if(rwydata[oaci] && !isModifiable) {
        isModifiable = true;
        populateFields(rwydata[oaci]);
        let notif = showNotif({type: 'failure', message: 'This airport is already in the database', duration: 0});
        setTimeout(() => {
            clearNotif(notif);
            showNotif({type: 'processing', message: 'You can now modify the data', duration: 2000});
        }, 1500);

        return;
    }
    
    
    try {
        createNewInput(data);
    } catch (err) {
        return;
    }
    

    rwydata[oaci] = newInput;
    
    //TODO: adapt code to accomodate 4 runways airports
    try {
        fs.writeFileSync(rwypath, JSON.stringify(rwydata, null, 2));
    } catch (err) {
        showNotif({type: 'failure', message: 'An error occured when saving to file', duration: 3000});
    }
    if(isModifiable) {
        showNotif({type: 'success', message: oaci + ' has been modified successfully', duration: 2000});
        form.reset();
    } else {
        showNotif({type: 'success', message: oaci + ' added to database', duration: 2000});
        form.reset();
    }
    isModifiable = false;
});

async function getRwyPath(){
    return new Promise((resolve, reject) => {
        ipcRenderer.send('request-rwypath');
        ipcRenderer.once('send-rwypath', (event, path) => {
            resolve(path);
        });
    });
}

function createNewInput(data){
    let keysToCopyRunway1 = ['heading1', 'preferential1', 'departure1', 'arrival1'];
    let keysToCopyRunway2 = ['heading2', 'preferential2', 'departure2', 'arrival2'];
    newInput = {
        "runways": {
            "1": {},
            "2": {}
        },
        "ICAO": oaci
    }
    
    try {
        for (let i = 0; i < keysToCopyRunway1.length; i++) {
            let key = keysToCopyRunway1[i];
            let value = data[key];
            if(value == '') {
                showNotif({type: 'failure', message: 'All fields must be filled', duration: 2000});
                throw new Error('');
            }
            if(key == 'heading1' || key == 'preferential1') {
                newInput["runways"]["1"][key.slice(0,-1)] = parseInt(value);
            } else {
                newInput["runways"]["1"][key.slice(0,-1)] = value;
            }
        }
    } catch (err) {
        throw new Error('');
    }
    
    try {
        for (let i = 0; i < keysToCopyRunway2.length; i++) {
            let key = keysToCopyRunway2[i];
            let value = data[key];
            if(value == '') {
                showNotif({type: 'failure', message: 'All fields must be filled', duration: 2000});
                throw new Error('');
            }
            if(key == 'heading2' || key == 'preferential2') {
                newInput["runways"]["2"][key.slice(0,-1)] = parseInt(value);
            } else {
                newInput["runways"]["2"][key.slice(0,-1)] = value;
            }
        }
    } catch (err) {
        throw new Error('');
    }
}

function populateFields(oaciData) {
    heading1.value = oaciData["runways"]["1"]["heading"];
    preferential1.value = oaciData["runways"]["1"]["preferential"];
    departure1.value = oaciData["runways"]["1"]["departure"];
    arrival1.value = oaciData["runways"]["1"]["arrival"];
    heading2.value = oaciData["runways"]["2"]["heading"];
    preferential2.value = oaciData["runways"]["2"]["preferential"];
    departure2.value = oaciData["runways"]["2"]["departure"];
    arrival2.value = oaciData["runways"]["2"]["arrival"];
}

document.getElementById('closebutton').addEventListener('click', () => {
    ipcRenderer.send('close-setting-window');
})

//event listener
document.getElementById('minimize-window').addEventListener('click', () => {
    ipcRenderer.send('minimize-setting-window');
});

document.getElementById('close-window').addEventListener('click', () => {
    ipcRenderer.send('close-setting-window');
});
import { showNotif, clearNotif } from "./notification.js";

const form = document.getElementsByClassName('dataform')[0];
let data;
let rwypath;
let newInput = {};


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
    try {
        createNewInput(data);
    } catch (err) {
        return;
    }
    if(rwydata[oaci]){
        //TODO: get airport data to prefill the form and so that the user can modify the entry
        showNotif({type: 'failure', message: 'This airport is already in the database', duration: 2000});
        return;
    }
    
    
    
    rwydata[oaci] = newInput;
    
    //TODO: adapt code to accomodate 4 runways airports
    try {
        fs.writeFileSync(rwypath, JSON.stringify(rwydata, null, 2));
    } catch (err) {
        showNotif({type: 'failure', message: 'An error occured when saving to file', duration: 3000});
    }
    showNotif({type: 'success', message: oaci + ' added to database', duration: 2000});
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
        keysToCopyRunway1.forEach(key => {
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
        })
    } catch (err) {
        throw new Error('');
    }
    
    try {
        keysToCopyRunway2.forEach(key => {
            let value = data[key];
            if(value == '') {
                showNotif({type: 'failure', message: 'All fields must be filled', duration: 2000});
                return;
            }
            if(key == 'heading2' || key == 'preferential2') {
                newInput["runways"]["2"][key.slice(0,-1)] = parseInt(value);
            } else {
                newInput["runways"]["2"][key.slice(0,-1)] = value;
            }
        })
    } catch (err) {
        throw new Error('');
    }
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
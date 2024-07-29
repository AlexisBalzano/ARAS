import { showNotif, clearNotif } from "./notification.js";

const form = document.querySelector('.dataform');
let data;
let rwypath;
let newInput = {};


form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    data = Object.fromEntries(formData.entries());
    rwypath = await getRwyPath();
    let rwydata = JSON.parse(fs.readFileSync(rwypath, 'utf8'));
    let oaci = data.oaci.toUpperCase();
    createNewInput(data);

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
        return;
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

    keysToCopyRunway1.forEach(key => {
        if(key == 'heading1' || key == 'preferential1') {
            newInput["runways"]["1"][key.slice(0,-1)] = parseInt(data[key]);
        } else {
            newInput["runways"]["1"][key.slice(0,-1)] = data[key];
        }
    })

    keysToCopyRunway2.forEach(key => {
        if(key == 'heading2' || key == 'preferential2') {
            newInput["runways"]["2"][key.slice(0,-1)] = parseInt(data[key]);
        } else {
            newInput["runways"]["2"][key.slice(0,-1)] = data[key];
        }
    })
}
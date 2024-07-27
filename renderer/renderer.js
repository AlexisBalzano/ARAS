const rwyFileButton = document.querySelector('#rwyButton')
const rwydataIndicator = document.querySelector('#rwydata');
const configIndicator = document.querySelector('#config');
const tokenStatus = document.querySelector('#tokenStatus');
const APItoken = document.querySelector('#APItoken');
const FIRselect = document.querySelector('#FIRselect');
const airportSelect = document.querySelector('#airportSelect');
const resetButton = document.querySelector('#resetButton');
const notifications = document.querySelector('.notifications');
const notifSuccess = document.querySelector('.success');
const notifFailure = document.querySelector('.failure');
const notifProcessing = document.querySelector('.processing');

let isPackaged = false;

let rwyPath;         //Runway data json file
let configPath;      //Settings preference json file

async function openReadme() {
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



async function tokenValid(configPath) {
    let data = fs.readFileSync(configPath, 'utf8');
    token = JSON.parse(data).apitoken;
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

    rwyPath = await assignPaths('rwydata.json');
    configPath = await assignPaths('config.json');
    userPreferencePath = await assignUserPreferencePaths();

    if (!fs.existsSync(userPreferencePath)) {
        showNotif({type:'failure', message:'User preference not found, please reinstall app', duration:0});
        return;
    }

    try {
        userPreference = JSON.parse(fs.readFileSync(userPreferencePath, 'utf8'));
    } catch(error) {
        showNotif({type:'failure', message:'User Preference corrupted, please reinsrall app', duration:0});
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



function loadRwyfile() {
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

// Buttons callbacks
// ARAS code
let token;
async function ARAS(FIR) {


    //VARIABLES

    const red = '\x1b[31m%s\x1b[0m';
    const green = '\x1b[32m%s\x1b[0m';

    let LFFF = [];
    let LFBB = [];
    let LFMM = [];
    let has4rwy = [];
    let outputPath = 'LFXX.rwy';



    //Utilities
    function GetMetar(i) {
        //API ident
        const headers = {
        'Authorization': token
        };
        return fetch('https://avwx.rest/api/metar/' + i, { headers })
            .then(response => {
                if(response.status === 403 || response.status === 401) {
                    throw new Error('Invalid API token');
                } else if (response.status === 408) {
                    throw new Error('Request timed out');
                }
                return response.json()
            })
}

    function getRwyData(oaci){
        try {
            const data = fs.readFileSync(rwyPath, 'utf8');
            return JSON.parse(data);
        } catch (err) {
            console.error(err);
        }
    }

    function assignRunways(oaci, metarJson){
        //Initialize data
        let has4runways = false;
        let HeadwindComponent = 0;
        let headwind = false;
        let rwychoosen = '';
        let winddir = 0
        let windspeed = 0
        const rwyData = getRwyData(oaci)
        if ('wind_direction' in metarJson && 'value' in metarJson['wind_direction']) {
            winddir = metarJson['wind_direction']['value'];
        } else {
            console.log('wind_direction value is not present');
            return;
        }
        if ('wind_speed' in metarJson && 'value' in metarJson['wind_speed']) {
            windspeed = metarJson['wind_speed']['value'];
        } else {
            console.log('wind_speed value is not present');
            return;
        }


        if(has4rwy.includes(oaci))
            has4runways = true;

        if(winddir === 'VRB') { //Assign the first runway (preferential)
            rwychoosen = "ACTIVE_RUNWAY:" + oaci + ":" + rwyData[oaci]['runways']['1']['arrival'] + ':0\n' + "ACTIVE_RUNWAY:" + oaci + ":" + rwyData[oaci]['runways']['1']['departure'] + ':1'
            if(has4runways)
                rwychoosen += "\n" + "ACTIVE_RUNWAY:" + oaci + ":" + rwyData[oaci]['runways']['3']['arrival'] + ':0\n' + "ACTIVE_RUNWAY:" + oaci + ":" + rwyData[oaci]['runways']['3']['departure'] + ':1'
        } else {
            const rwyHeading = rwyData[oaci]['runways']['1']['heading'];
            const preferential = rwyData[oaci]['runways']['1']['preferential'];
            if(winddir === rwyHeading){
                HeadwindComponent = windspeed
                headwind = true
            } else if(winddir === rwyHeading + 180 || winddir === rwyHeading - 180){
                HeadwindComponent = windspeed
                headwind = false
            } else {
                let alpha = Math.cos(rwyHeading * Math.PI / 180) * Math.cos(winddir * Math.PI / 180) + Math.sin(rwyHeading * Math.PI / 180) * Math.sin(winddir * Math.PI / 180)
                HeadwindComponent = Math.abs(windspeed * Math.sin(alpha))
                if(alpha < 0)
                    headwind = false
                else
                    headwind = true
            }

            //Format the output
            if (headwind) {
                rwychoosen = "ACTIVE_RUNWAY:" + oaci + ":" + rwyData[oaci]['runways']['1']['arrival'] + ':0\n' + "ACTIVE_RUNWAY:" + oaci + ":" + rwyData[oaci]['runways']['1']['departure'] + ':1\n'
                if(has4runways)
                    rwychoosen += "ACTIVE_RUNWAY:" + oaci + ":" + rwyData[oaci]['runways']['3']['arrival'] + ':0\n' + "ACTIVE_RUNWAY:" + oaci + ":" + rwyData[oaci]['runways']['3']['departure'] + ':1\n'

            } else {
                if( HeadwindComponent >= preferential)
                    rwychoosen = "ACTIVE_RUNWAY:" + oaci + ":" + rwyData[oaci]['runways']['2']['arrival'] + ':0\n' + "ACTIVE_RUNWAY:" + oaci + ":" + rwyData[oaci]['runways']['2']['departure'] + ':1\n'
                    if(has4runways)
                        rwychoosen += "ACTIVE_RUNWAY:" + oaci + ":" + rwyData[oaci]['runways']['4']['arrival'] + ':0\n' + "ACTIVE_RUNWAY:" + oaci + ":" + rwyData[oaci]['runways']['4']['departure'] + ':1\n'

                else
                    rwychoosen = "ACTIVE_RUNWAY:" + oaci + ":" + rwyData[oaci]['runways']['1']['arrival'] + ':0\n' + "ACTIVE_RUNWAY:" + oaci + ":" + rwyData[oaci]['runways']['1']['departure'] + ':1\n'
                    if(has4runways)
                        rwychoosen += "ACTIVE_RUNWAY:" + oaci + ":" + rwyData[oaci]['runways']['3']['arrival'] + ':0\n' + "ACTIVE_RUNWAY:" + oaci + ":" + rwyData[oaci]['runways']['3']['departure'] + ':1\n'
            }
        }

        fs.appendFile(outputPath, rwychoosen, (err) => {
            if (err) {
                console.error(err);
            }
        });
    }


    // Output
    
    
    let configIsOkay = true;
    function testRequirements() {
        if (fs.existsSync(configPath)) {
            if (fs.statSync(configPath).size === 0) {
                console.log('config.json is empty.\nCreating default config.');
                createDefaultConfig(configPath);
            }
            const path = JSON.parse(fs.readFileSync(configPath, 'utf8')).outputPath;
            if (path !== null) {
                outputPath = path;
                rwyFileButton.style.backgroundColor = 'green';
                rwyFileButton.innerText = '.rwy file selected';
            } else {
                console.log('outputPath not found in config.json.\nOutputing to default location.');
                outputPath = 'LFXX.rwy';
                showNotif({type: 'failure', message: 'outputPath not found in config.json. Outputing to default location.', duration: 1500});
            }
            //Initializing variables
            LFMM = JSON.parse(fs.readFileSync(configPath, 'utf8')).FIRairports.LFMM;
            LFFF = JSON.parse(fs.readFileSync(configPath, 'utf8')).FIRairports.LFFF;
            LFBB = JSON.parse(fs.readFileSync(configPath, 'utf8')).FIRairports.LFBB;
            has4rwy = JSON.parse(fs.readFileSync(configPath, 'utf8')).FIRairports.has4runways;
            token = JSON.parse(fs.readFileSync(configPath, 'utf8')).apitoken;
            if (token === null) {
                console.log('API Token not found in config.json.\nPlease fill it in.');
                showNotif({type: 'failure', message: 'API Token not found in config.json. Please fill it in.', duration: 1500});
                configIsOkay = false;
                return;
            }
        } else {
            console.log('config.json not found.\nCreating default config.');
            createDefaultConfig(configPath);
            showNotif({type: 'failure', message: 'config.json not found. Creating default config.', duration: 1500});
            return;
        }
        if (fs.existsSync(outputPath)) {
            fs.writeFile(outputPath, '', (err) => {
                if (err) {
                    console.error('Error clearing file:', err);
                }
            });
        } else {
            console.log('LFXX.rwy not found.\nCreating one...');
            showNotif({type:'failure', message:'LFXX.rwy not found. Creating one...'})
            fs.writeFile(outputPath, '', (err) => {
                if (err) {
                    console.error('Error creating file:', err);
                }
            });
        }
    }

    function activateAirports(oaci){
        let out = 'ACTIVE_AIRPORT:' + oaci + ':1\n' + 'ACTIVE_AIRPORT:' + oaci + ':0\n'
        fs.appendFile(outputPath, out, (err) =>  {
            if (err) {
                console.error(err);
            }
        });
    }

    //Assign runways
    async function assignRunwaysForFIRs(FIRoaci) {
        let isOkay = true;
        previousNotif = showNotif({type: 'processing', message: 'Assigning Runways... Wait for the confirmation notification', duration: 0});
        for (const i of FIRoaci) {
            try {
                const metarJson = await GetMetar(i);
                
                assignRunways(i, metarJson);
            } catch (error) {
                console.log(error)
                if(error.message === 'Invalid API token') {
                    config.tokenValidity = false;
                    showNotif({type: 'failure', message: 'Invalid API token', duration: 5000});
                } else if (error.message === 'Request timed out') {                
                    showNotif({type: 'failure', message: 'Request timed out', duration: 5000});
                } else {
                    showNotif({type: 'failure', message: 'Error fetching metars', duration: 5000});
                }
                isOkay = false;
                clearNotif(previousNotif);
                return;
            }
        }
        clearNotif(previousNotif);
        if (isOkay) {
            showNotif({type: 'success', message: 'Runways assigned', duration: 1500});
        }
    }
    
    //MAIN
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    config.tokenValidity = true;
    
    testRequirements()
    if(!configIsOkay)
        return;
    
    
    let FIRoaci = LFMM
    
    if(FIR === 'LFFF') {
        FIRoaci = LFFF
    } else if (FIR === 'LFBB') {
        FIRoaci = LFBB
    }
    
    //Activate airports
    for(i in FIRoaci){
        activateAirports(FIRoaci[i])
    }
    showNotif({type:'success', message:'Airports activated', duration:1500})
    
    
    await assignRunwaysForFIRs(FIRoaci);

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    tokenValid(configPath);
}

let FIR = 'LFFF'
let airportsList = []

function FIRconfigUpdater(FIR, airportsList) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    config.FIRairports[FIR] = airportsList;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}


function FIRmanagement(rwyData, value, option) {
    //TODO: utilise config.json
    switch (option) {
        case 'A': //add
            //verify that is not already added

            break;
        case 'D': //delete
            break;
        case 'E': //edit
            break;
        default: throw error('Invalid action type')
    }
}    

function AirportsManagement(rwyData, value, option) {
    switch (option) {
        case 'A': //add
            //verify that is not already added
            if(rwydata.includes(value)) {
                throw error('Already supported');
            }
            //Sinon l'ajoute à la liste
            rwyData.push(value);
            break;
            
            case 'D': //delete
                if(rwydata.includes(value)) {
                    rwyData.splice(rwyData.indexOf(value), 1);
                } else {
                    throw error('Airport not supported');
                }
            break;
        
        default: throw error('Invalid action type');
    }
}

function RwyManagement(rwyData, value, option) {
    
}    

function rwyDataModifier(type, value, option) {
    //TODO:
    const rwydata = JSON.parse(fs.readFileSync(rwyPath, 'utf8'));

    if (type === 'FIR') {
        try {
            FIRmanagement(rwydata, value, option);
            showNotif({type: 'success', message: 'FIR data modified successfully', duration: 1500});
        } catch (error) {
            console.log(error);
            showNotif({type: 'failure', message: error, duration: 1500});
        }
    } else if (type === 'Airports') {
        try {
            AirportsManagement(rwydata, value, option);
            showNotif({type: 'success', message: 'Airports data modified successfully', duration: 1500});
        } catch (error) {
            console.log(error);
            showNotif({type: 'failure', message: error, duration: 1500});
        }
    } else if (type === 'Runway') {
        try {
            RwyManagement(rwydata, value, option);
            showNotif({type: 'success', message: 'Runway data modified successfully', duration: 1500});
        } catch (error) {
            showNotif({type: 'failure', message: error, duration: 1500});
        }
    } else {
        showNotif({type: 'failure', message: 'Type error in rwydata', duration: 1500});
    }

    fs.writeFileSync(rwyPath, JSON.stringify(rwydata, null, 2));
}

//Notifications system
function showNotif(options) {
    let notif;
    if (options.type === 'success') {
        notif = notifSuccess.cloneNode(true);
    } else if (options.type === 'failure') {
        notif = notifFailure.cloneNode(true);
    } else {
        notif = notifProcessing.cloneNode(true);
    }
    notif.innerHTML = options.message;
    notif.style.display = 'block';
    notifications.appendChild(notif);

    if (options.duration !== 0) {
        setTimeout(() => {
            notif.classList.add('notifOut');
            setTimeout(() => {
                notif.style.display = 'none';
                notif.remove();
            }, 99);
        }, options.duration);
    }
    return notif;
}

function clearNotif(notif) {
    notif.classList.add('notifOut');
    setTimeout(() => {
        notifications.removeChild(notif);
    }, 99);
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


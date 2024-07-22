const rwyFileButton = document.querySelector('#rwyButton')
const rwydataIndicator = document.querySelector('#rwydata');
const configIndicator = document.querySelector('#config');
const tokenStatus = document.querySelector('#tokenStatus');
const APItoken = document.querySelector('#APItoken');
const FIRselect = document.querySelector('#FIRselect');
const airportSelect = document.querySelector('#airportSelect');
const resetButton = document.querySelector('#resetButton');


let isPackaged = false; //FIXME: change before packaging

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
        }
    };

    fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2), (err) => {
        if (err) {
            console.error(red,'Error creating file:', err);
        } else {
            console.log(green,'File created successfully.');
        }
    });
    pathAssignement();
}

async function assignPaths(filename) {
    const appPath = await window.electron.getAppPath();
    if(isPackaged) {
        return path.join(appPath, '..', 'config', filename);
    } else {
        return path.join(appPath, 'config', filename);   
    }
}

function tokenValid(configPath) {
    token = JSON.parse(fs.readFileSync(configPath, 'utf8')).apitoken;
    if (token !== null && token !== '') {
        tokenStatus.style.color = 'yellow';
        tokenStatus.title = "API token found but not verified";
        APItoken.placeholder = token;
        if (JSON.parse(fs.readFileSync(configPath, 'utf8')).tokenValidity) {
            tokenStatus.style.color = 'green';
            tokenStatus.title = "API token found and verified";
        }
        return;
    }
    APItoken.placeholder = 'Enter API token';
}

async function pathAssignement() {
    // Get the path to the resources directory

    rwyPath = await assignPaths('rwydata.json')
    configPath = await assignPaths('config.json')

    
    // Check if config.json is detected
    if (fs.existsSync(configPath)) {
        configIndicator.style.color = 'var(--green)';
        configIndicator.title = "config.json found";
        tokenValid(configPath);
        if (JSON.parse(fs.readFileSync(configPath, 'utf8')).outputPath !== null) {
            rwyFileButton.style.backgroundColor = 'var(--green)';
            rwyFileButton.innerText = 'Using previous file location';
        }
    } else {
        alertError('Config.json not found');
        createDefaultConfig(configPath)
        alertSuccess('Default Config.json created');
    }
    // Check if rwydata.json is detected
    if (fs.existsSync(rwyPath)) {
        rwydataIndicator.style.color = 'var(--green)';
        rwydataIndicator.title = "rwydata.json found";
    } else {
        alertError('rwydata.json not found');
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

function alertLoad(message) {
    Toastify.toast({
        text: message,
        duration: 2500,
        close: false,
        style: {
            background: 'yellow',
            color: 'black',
            textAlign: 'center'
        }
    })
}

function alertError(message) {
    Toastify.toast({
        text: message,
        duration: -1,
        close: true,
        style: {
            background: 'red',
            color: 'white',
            textAlign: 'center'
        }
    })
}

function alertSuccess(message) {
    Toastify.toast({
        text: message,
        duration: 1500,
        close: false,
        style: {
            background: 'green',
            color: 'white',
            textAlign: 'center'
        }
    })
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
                }
                return response.json()
            })
            .catch(error => {
            });
    }

    function getRwyData(oaci){
        try {
            const data = fs.readFileSync(rwyPath, 'utf8');
            return JSON.parse(data);
        } catch (err) {
            console.error(red,'Error reading file:', err);
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
                console.error(red, 'Error writing file:', err);
            } else {
                console.log(green, oaci + ' runway assigned successfully.');
            }
        });
    }


    // Output
    
    
    let configIsOkay = true;
    function testRequirements() {
        if (fs.existsSync(configPath)) {
            console.log(green,'config.json found.');
            if (fs.statSync(configPath).size === 0) {
                console.log(red,'config.json is empty.\nCreating default config.');
                createDefaultConfig(configPath);
            }
            const path = JSON.parse(fs.readFileSync(configPath, 'utf8')).outputPath;
            if (path !== null) {
                outputPath = path;
                rwyFileButton.style.backgroundColor = 'green';
                rwyFileButton.innerText = '.rwy file selected';
            } else {
                console.log(red,'outputPath not found in config.json.\nOutputing to default location.');
                outputPath = 'LFXX.rwy';
                alertError('outputPath not found in config.json. Outputing to default location.')
            }
            //Initializing variables
            LFMM = JSON.parse(fs.readFileSync(configPath, 'utf8')).FIRairports.LFMM;
            LFFF = JSON.parse(fs.readFileSync(configPath, 'utf8')).FIRairports.LFFF;
            LFBB = JSON.parse(fs.readFileSync(configPath, 'utf8')).FIRairports.LFBB;
            has4rwy = JSON.parse(fs.readFileSync(configPath, 'utf8')).FIRairports.has4runways;
            token = JSON.parse(fs.readFileSync(configPath, 'utf8')).apitoken;
            if (token === null) {
                console.log(red,'API Token not found in config.json.\nPlease fill it in.');
                alertError('API Token not found in config.json. Please fill it in.')
                configIsOkay = false;
                return;
            }
        } else {
            console.log(red,'config.json not found.\nCreating default config.');
            createDefaultConfig(configPath);
            alertError('config.json not found. Creating default config.')
            return;
        }
        if (fs.existsSync(outputPath)) {
            console.log(green,'LFXX.rwy found.');
            fs.writeFile(outputPath, '', (err) => {
                if (err) {
                    console.error(red,'Error clearing file:', err);
                } else {
                    console.log(green,'LFXX.rwy cleared successfully.');
                }
            });
        } else {
            console.log(red,'LFXX.rwy not found.\nCreating one...');
            alertError('LFXX.rwy not found. Creating one...')
            fs.writeFile(outputPath, '', (err) => {
                if (err) {
                    console.error(red,'Error creating file:', err);
                } else {
                    console.log(green,'File created successfully.');
                }
            });
        }
    }

    function activateAirports(oaci){
        let out = 'ACTIVE_AIRPORT:' + oaci + ':1\n' + 'ACTIVE_AIRPORT:' + oaci + ':0\n'
        fs.appendFile(outputPath, out, (err) =>  {
            if (err) {
                console.error(red, 'Error writing file:', err);
            } else {
                console.log(green, oaci + ' activated successfully.');
            }
        });
    }

    //Assign runways
    async function assignRunwaysForFIRs(FIRoaci) {
        let isOkay = true;
        alertLoad('Assigning Runways... Wait for the confirmation notification')
        for (const i of FIRoaci) {
            try {
                const metarJson = await GetMetar(i);
                
                assignRunways(i, metarJson);
            } catch (error) {
                config.tokenValidity = false;
                isOkay = false;
            }
        }
        if (isOkay) {
            alertSuccess('Runways assigned')
        } else {
            alertError('Assignement error!')
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
    alertSuccess('Airports Activated')
    
    
    await assignRunwaysForFIRs(FIRoaci);
    
    console.log('Token validity:', config.tokenValidity);
    if(!config.tokenValidity) {
        alertError('API token invalid')
    }
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
            alertSuccess('FIR data modified successfully');
        } catch (error) {
            console.log(error);
            alertError(error);
        }
    } else if (type === 'Airports') {
        try {
            AirportsManagement(rwydata, value, option);
            alertSuccess('Airports data modified successfully');
        } catch (error) {
            console.log(error);
            alertError(error);
        }
    } else if (type === 'Runway') {
        try {
            RwyManagement(rwydata, value, option);
            alertSuccess('Runway data modified successfully');
        } catch (error) {
            console.log(error);
            alertError(error);
        }
    } else {
        console.log('Type error in rwydata');
        alertError('Type error in rwydata');
    }

    fs.writeFileSync(rwyPath, JSON.stringify(rwydata, null, 2));
}



//Listeners

APItoken.addEventListener('change', () => {
    const token = APItoken.value;
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    config.apitoken = token;
    config.tokenValidity = false;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    alertSuccess('API token saved')
    tokenValid(configPath);
})

FIRselect.addEventListener('change', () => {
    FIR = FIRselect.value;
    populateAiportsList(FIRselect.value);
})

airportSelect.addEventListener('change', () => {
    const airport = airportSelect.value;
    if(airport === '') {
        alertError('No airport entered');
        return;
    }
    airportsList = airport.split(',').map(item => item.trim()).filter(item => item !== '');
    FIRconfigUpdater(FIR, airportsList);
    alertSuccess(FIR + ' airports updated')
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
    alertSuccess(FIR + ' airports resetted')
    populateAiportsList(FIR);
})

document.getElementById('minimize-window').addEventListener('click', () => {
    ipcRenderer.send('minimize-window');
});

document.getElementById('close-window').addEventListener('click', () => {
    ipcRenderer.send('close-window');
});
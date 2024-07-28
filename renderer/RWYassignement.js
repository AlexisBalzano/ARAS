const rwyFileButton = document.querySelector('#rwyButton')
const tokenStatus = document.querySelector('#tokenStatus');



// ARAS code
let token;
export async function ARAS(FIR, configPath, rwyPath, showNotif, clearNotif, createDefaultConfig, tokenValid, fs) {


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
            LFMM = config.FIRairports.LFMM;
            LFFF = config.FIRairports.LFFF;
            LFBB = config.FIRairports.LFBB;
            has4rwy = config.FIRairports.has4runways;
            token = config.apitoken;
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
    let isOkay = true;
    async function assignRunwaysForFIRs(FIRoaci) {
        let previousNotif = showNotif({type: 'processing', message: 'Assigning Runways... Wait for the confirmation notification', duration: 0});
        for (const i of FIRoaci) {
            try {
                const metarJson = await GetMetar(i);

                assignRunways(i, metarJson);
            } catch (error) {
                if(error.message === 'Invalid API token') {
                    config.tokenValidity = false;
                    tokenStatus.style.color = 'red';
                    tokenStatus.title = 'Invalid API token';
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

    let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    config.tokenValidity = false;
    
    testRequirements()
    
    let FIRoaci = LFMM
    
    if(FIR === 'LFFF') {
        FIRoaci = LFFF
    } else if (FIR === 'LFBB') {
        FIRoaci = LFBB
    }
    
    //Activate airports
    for(let i in FIRoaci){
        activateAirports(FIRoaci[i])
    }
    showNotif({type:'success', message:'Airports activated', duration:1500})
    
    await assignRunwaysForFIRs(FIRoaci);
    
    console.log(isOkay)
    if(isOkay) {
        config.tokenValidity = true;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        tokenValid(configPath);
    } else {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        return;
    }
}
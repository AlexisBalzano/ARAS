const rwyFileButton = document.getElementById('rwyButton')
const tokenStatus = document.getElementById('tokenStatus');



// ARAS code
let token;
export async function ARAS(FIR, paths, showNotif, clearNotif, createDefaultConfig, tokenValid, fs) {


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
            }
        )
    }

    function getRwyData(oaci){
        try {
            const data = fs.readFileSync(paths.rwyPath, 'utf8');
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

        console.log("OACI: " + oaci) //FIXME: Remove

        if ('wind_direction' in metarJson && 'value' in metarJson['wind_direction']) {
            winddir = metarJson['wind_direction']['value'];
            console.log("winddir: " + winddir) //FIXME: Remove
        } else {
            console.log('wind_direction value is not present');
            return;
        }
        if ('wind_speed' in metarJson && 'value' in metarJson['wind_speed']) {
            windspeed = parseInt(metarJson['wind_speed']['value'],10);
            console.log("windspeed: " + windspeed) //FIXME: Remove
        } else {
            console.log('wind_speed value is not present');
            return;
        }


        if(has4rwy.includes(oaci))
            has4runways = true;
            console.log("has4rwy: " + has4runways) //FIXME: Remove

        if(winddir === 'VRB') { //Assign the first runway (preferential)
            console.log("VRB wind") //FIXME: Remove

            rwychoosen = "ACTIVE_RUNWAY:" + oaci + ":" + rwyData[oaci]['runways']['1']['arrival'] + ':0\n' + "ACTIVE_RUNWAY:" + oaci + ":" + rwyData[oaci]['runways']['1']['departure'] + ':1'
            if(has4runways)
                rwychoosen += "\n" + "ACTIVE_RUNWAY:" + oaci + ":" + rwyData[oaci]['runways']['3']['arrival'] + ':0\n' + "ACTIVE_RUNWAY:" + oaci + ":" + rwyData[oaci]['runways']['3']['departure'] + ':1'
        } else {
            const rwyHeading = rwyData[oaci]['runways']['1']['heading'];
            const preferential = rwyData[oaci]['runways']['1']['preferential'];
            if(parseInt(winddir,10) === rwyHeading){
                console.log("Full headwind") //FIXME: Remove
                HeadwindComponent = windspeed
                headwind = true
            } else if((parseInt(winddir,10) === rwyHeading + 180 ) || (parseInt(winddir,10) === rwyHeading - 180)){
                console.log("Full tailwind") //FIXME: Remove
                HeadwindComponent = windspeed
                headwind = false
            } else {
                let angleA = parseInt(rwyHeading,10) * Math.PI / 180
                console.log("Angle piste: " + angleA) //FIXME: Remove
                let angleB = parseInt(winddir,10) * Math.PI / 180
                console.log("Angle vent: " + angleB) //FIXME: Remove
                let alpha = (angleA - angleB)
                console.log("Angle diff: " + alpha) //FIXME: Remove
                HeadwindComponent = windspeed * Math.cos(alpha)
                console.log("Hedwind component: " + HeadwindComponent) //FIXME: Remove
                if(HeadwindComponent > 0) {
                    console.log("Headwind") //FIXME: Remove
                    headwind = true
                }
                else {
                    console.log("Tailwind") //FIXME: Remove
                    headwind = false
                }
            }

            //Format the output
            if (headwind) {
                console.log("Printing runway 1") //FIXME: Remove
                rwychoosen = "ACTIVE_RUNWAY:" + oaci + ":" + rwyData[oaci]['runways']['1']['arrival'] + ':0\n' + "ACTIVE_RUNWAY:" + oaci + ":" + rwyData[oaci]['runways']['1']['departure'] + ':1\n'
                if(has4runways)
                    rwychoosen += "ACTIVE_RUNWAY:" + oaci + ":" + rwyData[oaci]['runways']['3']['arrival'] + ':0\n' + "ACTIVE_RUNWAY:" + oaci + ":" + rwyData[oaci]['runways']['3']['departure'] + ':1\n'

            } else {
                if( Math.abs(HeadwindComponent) >= preferential) {
                    console.log("Printing runway 2") //FIXME: Remove
                    rwychoosen = "ACTIVE_RUNWAY:" + oaci + ":" + rwyData[oaci]['runways']['2']['arrival'] + ':0\n' + "ACTIVE_RUNWAY:" + oaci + ":" + rwyData[oaci]['runways']['2']['departure'] + ':1\n'
                    if(has4runways)
                        rwychoosen += "ACTIVE_RUNWAY:" + oaci + ":" + rwyData[oaci]['runways']['4']['arrival'] + ':0\n' + "ACTIVE_RUNWAY:" + oaci + ":" + rwyData[oaci]['runways']['4']['departure'] + ':1\n'
                }
                else {
                    console.log("Printing runway 1") //FIXME: Remove
                    rwychoosen = "ACTIVE_RUNWAY:" + oaci + ":" + rwyData[oaci]['runways']['1']['arrival'] + ':0\n' + "ACTIVE_RUNWAY:" + oaci + ":" + rwyData[oaci]['runways']['1']['departure'] + ':1\n'
                    if(has4runways)
                        rwychoosen += "ACTIVE_RUNWAY:" + oaci + ":" + rwyData[oaci]['runways']['3']['arrival'] + ':0\n' + "ACTIVE_RUNWAY:" + oaci + ":" + rwyData[oaci]['runways']['3']['departure'] + ':1\n'
                }
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
        if (fs.existsSync(paths.configPath)) {
            if (fs.statSync(paths.configPath).size === 0) {
                console.log('config.json is empty.\nCreating default config.');
                createDefaultConfig(paths.configPath);
            }
            const path = JSON.parse(fs.readFileSync(paths.configPath, 'utf8')).outputPath;
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
            createDefaultConfig(paths.configPath);
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

    let config = JSON.parse(fs.readFileSync(paths.configPath, 'utf8'));
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
    
    if(isOkay) {
        config.tokenValidity = true;
        fs.writeFileSync(paths.configPath, JSON.stringify(config, null, 2));
        tokenValid(paths.configPath);
    } else {
        fs.writeFileSync(paths.configPath, JSON.stringify(config, null, 2));
        return;
    }
}
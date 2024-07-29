const airportSelect = document.getElementById('airportSelect');


export function populateAiportsList(FIR, paths) {
    try {
        let airportsList = JSON.parse(fs.readFileSync(paths.configPath, 'utf8')).FIRairports[FIR];
        airportSelect.value = airportsList.join(', ');
    } catch (err) {
        console.log(err);
    }
}

let FIR = 'LFFF'
let airportsList = []

export function FIRconfigUpdater(FIR, airportsList, paths) {
    const config = JSON.parse(fs.readFileSync(paths.configPath, 'utf8'));
    config.FIRairports[FIR] = airportsList;
    fs.writeFileSync(paths.configPath, JSON.stringify(config, null, 2));
}
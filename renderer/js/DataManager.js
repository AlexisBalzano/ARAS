const airportSelect = document.getElementById('airportSelect');


export function populateAiportsList(FIR, paths) {
    let airportsList = JSON.parse(fs.readFileSync(paths.configPath, 'utf8')).FIRairports[FIR];
    airportSelect.value = airportsList.join(', ');
}

let FIR = 'LFFF'
let airportsList = []

export function FIRconfigUpdater(FIR, airportsList, paths) {
    const config = JSON.parse(fs.readFileSync(paths.configPath, 'utf8'));
    config.FIRairports[FIR] = airportsList;
    fs.writeFileSync(paths.configPath, JSON.stringify(config, null, 2));
}
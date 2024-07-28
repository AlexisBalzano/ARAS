let isPackaged = false;

export function setPackageState(windowisPackaged) {
    isPackaged = windowisPackaged;
}

export function createDefaultConfig(configPath){
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

export async function tokenValid(configPath) {
    let data = fs.readFileSync(configPath, 'utf8');
    let token = JSON.parse(data).apitoken;
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

export async function openReadme() {
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
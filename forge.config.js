require('dotenv').config();

module.exports = {
  packagerConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin"],
    },
  ],
  publishers: [
    {
      name: "@electron-forge/publisher-github",
      config: {
        repository: {
          owner: "AlexisBalzano",
          name: "ARAS",
        },
        authToken: process.env.GITHUB_AUTH_TOKEN,
        prerelease: false,
        draft: true,
        generateReleaseNotes: true,
      },
    },
  ],
};
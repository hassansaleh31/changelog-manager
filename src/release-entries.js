import fs from 'fs'
import path, { parse } from 'path'
import YAML from 'yaml'
import { getBranchName } from './utils/git-utils'
import { prepareRelease } from './prepare-entries'
import inquirer from 'inquirer'

const promptForMissingOptions = async (options) => {
    const questions = [];

    if (!options.version || options.version.trim() == '') {
        questions.push({
            type: 'input',
            name: 'version',
            message: 'Enter the release version: ',
            validate: (input) => {
                return new Promise((resolve, reject) => {
                    if (!input || input.trim() == '') {
                        reject('You need to provide a version')
                        return;
                    } else if (!input.match(/\d{1,}\.\d{1,}\.\d{1,}/)) {
                        reject(`Invalid version number.\n\tExpected: x.x.x\n\tRecieved: ${input}`)
                        return
                    }
                    resolve(true)
                })
            }
        })
    }

    const answers = await inquirer.prompt(questions);
    return {
        ...options,
        version: options.version || answers.version,
    };
}

export const releaseChangelog = async (options) => {
    options = await promptForMissingOptions(options);
    const branchName = await getBranchName()
    console.log(`Releasing changelog for version ${options.version} for ${branchName}`)
    const parsedReleases = await prepareRelease()

    if (!parsedReleases.unreleased || parsedReleases.unreleased.length == 0) {
        console.error('No unreleased entries found.')
        console.info('You can generate new entries using changelog-manager generate')
        process.exit(1)
    }

    // Check if version already exists
    const existingVersion = parsedReleases.releases.find(release => release.info.version == options.version)
    if (existingVersion) {
        console.error(`Version ${options.version} is already released`)
        process.exit(1)
    }

    // Sort versions
    parsedReleases.releases.sort((a, b) => -compareVersions(a.info.version, b.info.version))

    // Check if current version is bigger than the lastest
    const latestVersion = parsedReleases.releases.length > 0 ? parsedReleases.releases[0].info.version : null
    if (latestVersion && compareVersions(options.version, latestVersion) < 0) {
        console.error(`The provided version is not higher than the latest version.\n\tLatest version: ${latestVersion}\n\tProvided version: ${options.version}`)
        process.exit(1)
    }

    // Create the version folder
    const pathToRelease = path.join(process.cwd(), 'changelogs', options.version)
    if (!fs.existsSync(pathToRelease)) {
        fs.mkdirSync(pathToRelease, { recursive: true })
    }

    // Create the release info file
    const releaseInfo = {
        version: options.version,
        // TODO: get git username
        author: '',
        date: new Date(),
        'release-branch': branchName
    }
    fs.writeFileSync(path.join(pathToRelease, `${branchName}-${options.version}-info.yml`), YAML.stringify(releaseInfo))

    // Move unreleased changes to release folder
    releaseChanges(parsedReleases.unreleased, options.version, branchName)

    console.info('Released changelog entries successfully')
}

const compareVersions = (a, b) => {
    const aSplit = a.split('.')
    const bSplit = b.split('.')

    if (aSplit[0] != bSplit[0]) {
        return aSplit[0] - bSplit[0]
    }
    if (aSplit[1] != bSplit[1]) {
        return aSplit[1] - bSplit[1]
    }
    if (aSplit[2] != bSplit[2]) {
        return aSplit[2] - bSplit[2]
    }
}

const releaseChanges = (unreleased, version, branchName) => {
    for (let i = 0; i < unreleased.length; i++) {
        const entry = unreleased[i];
        entry['release-branch'] = branchName

        const pathToEntry = path.join(process.cwd(), 'changelogs', version, `RM-${entry.issue}.yml`)

        fs.writeFileSync(pathToEntry, YAML.stringify(entry))
    }
}
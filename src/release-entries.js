import fs from 'fs'
import path from 'path'
import YAML from 'yaml'
import { getBranchName } from './utils/git-utils'
import { prepareRelease } from './prepare-entries'
import inquirer from 'inquirer'
import { compareVersions } from './utils/versions'
import { generateChangelog } from './generate-changelog'

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
    console.info(`Releasing changelog for version ${options.version} for ${branchName}`)
    const parsedReleases = await prepareRelease(options)

    console.info('Checking for unreleased entries')
    if (!parsedReleases.unreleased || Object.keys(parsedReleases.unreleased).length == 0) {
        console.error('No unreleased entries found.')
        console.info('You can generate new entries using changelog-manager generate')
        process.exit(1)
    }

    // Check if version already exists
    console.info('Validating version')
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
    console.info('Starting the release process')
    const pathToRelease = path.join(process.cwd(), 'changelogs', options.version)
    if (!fs.existsSync(pathToRelease)) {
        fs.mkdirSync(pathToRelease, { recursive: true })
    }

    // Create the release info file
    console.info('Generating release info')
    const releaseInfo = {
        version: options.version,
        // TODO: get git username
        author: '',
        date: new Date(),
        'release-branch': branchName
    }
    fs.writeFileSync(path.join(pathToRelease, `${branchName}-${options.version}-info.yml`), YAML.stringify(releaseInfo))

    // Move unreleased changes to release folder
    console.info('Releasing changes')
    releaseChanges(parsedReleases.unreleased, options.version, branchName)

    console.info('Released changelog entries successfully')

    generateChangelog(options)
}

const releaseChanges = (unreleased, version, branchName) => {
    for (let i = 0; i < Object.keys(unreleased).length; i++) {
        const key = Object.keys(unreleased)[i];
        const entries = unreleased[key]

        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            const entryName = `RM-${entry.issue}.yml`

            console.info(`Releasing ${entryName}`)

            const pathToEntry = path.join(process.cwd(), 'changelogs', version, entryName)

            fs.writeFileSync(pathToEntry, YAML.stringify({
                title: entry.title,
                author: entry.author,
                issue: entry.issue,
                type: entry.type,
                'release-branch': branchName
            }))

            // TODO: Delete file
            fs.unlinkSync(entry.originalPath)
        }
    }
}